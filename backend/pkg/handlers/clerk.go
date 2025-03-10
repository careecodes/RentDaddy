package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/joho/godotenv"
	svix "github.com/svix/svix-webhooks/go"
)

type Role string

const (
	ADMIN  Role = "admin"
	TENANT Role = "tenant"
)

type ClerkUserPublicMetaData struct {
	DbId int32 `json:"db_id"`
	Role Role  `json:"role"`
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

func ClerkWebhookHanlder(w http.ResponseWriter, r *http.Request, queries *generated.Queries) {
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

func createUser(w http.ResponseWriter, r *http.Request, userData ClerkUserData, queries *generated.Queries) {
	res, err := queries.CreateTenant(r.Context(), generated.CreateTenantParams{
		Name:  fmt.Sprintf("%s %s", userData.FirstName, userData.LastName),
		Email: userData.Email,
	})
	if err != nil {
		log.Println("[CLERK_WEBHOOK] Failed inserting user in DB")
		http.Error(w, "Error inserting user", http.StatusInternalServerError)
		return
	}

	// Update clerk user metadata with DB ID, role, ect.
	dummyMetadata := &ClerkUserPublicMetaData{
		DbId: res.ID,
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

func updateUser(w http.ResponseWriter, r *http.Request, userData ClerkUserData, queries *generated.Queries) {
	// Querying clerk user data for DB ID
	clerkUserDataRaw, err := user.Get(r.Context(), userData.ID)
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed querying clerk user: %s", userData.ID)
		http.Error(w, "Error deleting user", http.StatusInternalServerError)
		return
	}

	var userMetadata ClerkUserPublicMetaData
	err = json.Unmarshal(clerkUserDataRaw.PublicMetadata, &userMetadata)
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed to unmarshal public metadata for user %v: %v", userData.ID, err)
		http.Error(w, "Error processing user data", http.StatusInternalServerError)
		return

	}
	res, err := queries.GetTenantByID(r.Context(), userMetadata.DbId)
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed querying for user %s: %v", userData.ID, err)
		http.Error(w, "Error processing user data", http.StatusInternalServerError)
		return
	}

	// Compare email, ect.
	if res.Email != userData.Email {
		// update DB
	}

	if res.Name != fmt.Sprintf("%s %s", userData.FirstName, userData.LastName) {
		// update DB
	}

	log.Printf("[CLERK_WEBHOOK] User updated: %s (%s)", userData.ID, userData.Email)
	w.WriteHeader(http.StatusOK)
}

func deleteUser(w http.ResponseWriter, r *http.Request, userData ClerkUserData, queries *generated.Queries) {
	// Delete user from DB
	clerkUserDataRaw, err := user.Get(r.Context(), userData.ID)
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed querying clerk user: %s", userData.ID)
		http.Error(w, "Error deleting user", http.StatusInternalServerError)
		return
	}

	var userMetadata ClerkUserPublicMetaData
	err = json.Unmarshal(clerkUserDataRaw.PublicMetadata, &userMetadata)
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed to unmarshal public metadata for user %v: %v", userData.ID, err)
		http.Error(w, "Error processing user data", http.StatusInternalServerError)
		return

	}

	err = queries.DeleteTenant(r.Context(), userMetadata.DbId)
	if err != nil {
		log.Println("[CLERK_WEBHOOK] Failed deleting user in DB")
		http.Error(w, "Error inserting user", http.StatusInternalServerError)
		return
	}

	log.Printf("[CLERK_WEBHOOK] User deleted: %s", userData.ID)
	w.WriteHeader(http.StatusOK)
}
