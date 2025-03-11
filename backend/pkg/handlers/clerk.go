package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/joho/godotenv"
	svix "github.com/svix/svix-webhooks/go"
)

type ClerkUserPublicMetaData struct {
	DbId int32   `json:"db_id"`
	Role db.Role `json:"role"`
}

type ClerkUserData struct {
	ID             string          `json:"id"`
	Email          string          `json:"email_address"`
	FirstName      string          `json:"first_name"`
	LastName       string          `json:"last_name"`
	ProfileImage   string          `json:"profile_image_url"`
	PublicMetaData json.RawMessage `json:"public_metadata"`
}

type ClerkWebhookPayload struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

func ClerkWebhookHanlder(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Println("[CLERK_WEBHOOK] Failed reading body")
		http.Error(w, "Failed reading body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if !Verify(body, r.Header) {
		log.Println("[CLERK_WEBHOOK] Invalid webhook signature")
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	var payload ClerkWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		log.Println("[CLERK_WEBHOOK] Failed parsing payload")
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	var clerkUserData ClerkUserData
	if err := json.Unmarshal(payload.Data, &clerkUserData); err != nil {
		log.Println("[CLERK_WEBHOOK] Failed parsing user data")
		http.Error(w, "Invalid user data", http.StatusBadRequest)
		return
	}

	if queries == nil {
		log.Println("[CLERK_WEBHOOK] Database queries instance is nil")
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Subscribed events
	switch payload.Type {
	case "user.created":
		createUser(w, r, clerkUserData, queries)
	case "user.updated":
		updateUser(w, r, clerkUserData, queries)
	case "user.deleted":
		deleteUser(w, r, clerkUserData, queries)
	default:
		log.Printf("Unhandled event: %s", payload.Type)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"received"}`))
		return
	}
}

func Verify(payload []byte, headers http.Header) bool {
	if err := godotenv.Load(); err != nil {
		log.Printf("[CLERK WEBHOOK] No .env file found %v", err)
		return false
	}

	webhookSecret := os.Getenv("CLERK_WEBHOOK")
	if webhookSecret == "" {
		log.Println("[CLERK_WEBHOOK] Environment variable is required")
		return false
	}
	wh, err := svix.NewWebhook(webhookSecret)
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Svix failed initailizing %v", err)
		return false
	}

	err = wh.Verify(payload, headers)
	if err != nil {
		log.Printf("[CLERK_WEBHOOK]Invalid webhook signature: %v", err)
		return false
	}

	return true
}

func createUser(w http.ResponseWriter, r *http.Request, userData ClerkUserData, queries *db.Queries) {
	res, err := queries.CreateUser(r.Context(), db.CreateUserParams{
		ClerkID:   userData.ID,
		FirstName: userData.FirstName,
		LastName:  userData.LastName,
		Role:      db.RoleAdmin, // This will need an update
		Status:    db.AccountStatusActive,
		LastLogin: pgtype.Timestamp{Time: time.Now(), Valid: true},
		UpdatedAt: pgtype.Timestamp{Time: time.Now(), Valid: true},
		CreatedAt: pgtype.Timestamp{Time: time.Now(), Valid: true},
	})
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed inserting user in DB: %v", err)
		http.Error(w, "Error inserting user", http.StatusInternalServerError)
		return
	}

	// Update clerk user metadata with DB ID, role, ect.
	dummyMetadata := &ClerkUserPublicMetaData{
		DbId: int32(res.ID),
		Role: "tenant",
	}

	// Convert metadata to raw json
	metadataBytes, err := json.Marshal(dummyMetadata)
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Error updating user with db credintials: %v", err)
		metadataBytes = []byte("{}")
	}
	metadata := json.RawMessage(metadataBytes)

	_, err = user.Update(r.Context(), userData.ID, &user.UpdateParams{
		PublicMetadata: &metadata,
	})
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Error could not update user metadata: %v", err)
		// Currently not erroring out
	}

	log.Printf("[CLERK_WEBHOOK] New user created: %s (%s)", userData.ID, userData.Email)
	w.WriteHeader(http.StatusCreated)
}

func updateUser(w http.ResponseWriter, r *http.Request, userData ClerkUserData, queries *db.Queries) {
	if err := queries.UpdateUserCredentials(r.Context(), db.UpdateUserCredentialsParams{
		FirstName: userData.FirstName,
		LastName:  userData.LastName,
		Email:     userData.Email,
		ClerkID:   userData.ID,
	}); err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed updating user %s: %v", userData.ID, err)
		http.Error(w, "Error updating user data", http.StatusInternalServerError)
		return
	}

	log.Printf("[CLERK_WEBHOOK] User updated: %s (%s)", userData.ID, userData.Email)
	w.WriteHeader(http.StatusOK)
}

func deleteUser(w http.ResponseWriter, r *http.Request, userData ClerkUserData, queries *db.Queries) {
	if err := queries.DeleteUserByClerkID(r.Context(), userData.ID); err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed deleting user %s: %v", userData.ID, err)
		http.Error(w, "Error deleting user data", http.StatusInternalServerError)
		return

	}

	log.Printf("[CLERK_WEBHOOK] User deleted: %s", userData.ID)
	w.WriteHeader(http.StatusOK)
}
