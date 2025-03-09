package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/joho/godotenv"
	svix "github.com/svix/svix-webhooks/go"
)

type ClerkUserPublicMetaData map[string]interface{}

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

	// Subscribed events
	switch payload.Type {
	case "user.created":
		createUser(w, r, clerkUserData, queries)
	case "user.updated":
		updateUser(w, clerkUserData)
	case "user.deleted":
		deleteUser(w, clerkUserData)
	default:
		log.Printf("Unhandled event: %s", payload.Type)
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"received"}`))
}

func createUser(w http.ResponseWriter, r *http.Request, userData ClerkUserData, queries *generated.Queries) {
	res, err := queries.CreateTenant(r.Context(), generated.CreateTenantParams{
		Name:  fmt.Sprintf("%s %s", userData.FirstName, userData.LastName),
		Email: userData.Email,
	})
	if err != nil {
		log.Println("[CLERK_WEBHOOK] Failed inserting user in DB")
		http.Error(w, "Error inserting user", http.StatusInternalServerError)
	}

	// Update clerk user metadata with DB ID, role, ect.
	dummyMetadata := &ClerkUserPublicMetaData{
		"dbID": res.ID,
		"role": "tenant",
	}

	// Convert metadata to raw json
	metadataBytes, err := json.Marshal(dummyMetadata)
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Error updating user with db credintials: %v", err)
		metadataBytes = []byte("{}")
	}
	metadata := json.RawMessage(metadataBytes)

	// Update metadata
	maxRetries := 3
	for i := 0; i < maxRetries; i++ {
		_, err = user.Update(r.Context(), userData.ID, &user.UpdateParams{
			PublicMetadata: &metadata,
		})
		if err == nil {
			break
		}

		log.Printf("[CLERK_WEBHOOK] Retry %d/%d Failed updating user %s metadata Error: %v", i+1, maxRetries, userData.ID, err)
		time.Sleep(time.Duration(i+1) * time.Second)
	}
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Error could not update user metadata: %v", err)
		// Currently not erroring out
	}

	log.Printf("[CLERK_WEBHOOK] New user created: %s (%s)", userData.ID, userData.Email)
	w.WriteHeader(http.StatusCreated)
}

func updateUser(w http.ResponseWriter, userData ClerkUserData) {
	// Query user from DB
	// Compare email, ect.
	log.Printf("[CLERK_WEBHOOK] User updated: %s (%s)", userData.ID, userData.Email)
	w.WriteHeader(http.StatusOK)
}

func deleteUser(w http.ResponseWriter, userData ClerkUserData) {
	// Delete user from DB
	log.Printf("[CLERK_WEBHOOK] User deleted: %s", userData.ID)
	w.WriteHeader(http.StatusOK)
}
