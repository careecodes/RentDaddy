package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	svix "github.com/svix/svix-webhooks/go"
)

type ClerkUserData struct {
	ID           string `json:"id"`
	Email        string `json:"email_address"`
	FirstName    string `json:"first_name"`
	LastName     string `json:"last_name"`
	ProfileImage string `json:"profile_iamge_url"`
}

type ClerkWebhookPayload struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

func Verify(payload []byte, headers http.Header) bool {
	if err := godotenv.Load(); err != nil {
		log.Println("[CLERK WEBHOOK] No .env file found")
		return false
	}

	webhookSecret := os.Getenv("CLERK_WEBHOOK")
	if webhookSecret == "" {
		log.Fatal("[CLERK WEBHOOK] CLERK_SECRET_KEY environment variable is required")
		return false
	}
	wh, err := svix.NewWebhook(webhookSecret)
	if err != nil {
		log.Printf("[CLERK WEBHOOK] Svix failed initailizing %s", err)
		return false
	}
	// Varify
	err = wh.Verify(payload, headers)
	if err != nil {
		log.Printf("Invalid webhook signature: %v", err)
		return false
	}

	return true
}

func ClerkWebhookHanlder(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Fatal("[CLERK WEBHOOK] failed reading body")
		http.Error(w, "Failed reading body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Varify
	if !Verify(body, r.Header) {
		log.Printf("Invalid webhook signature: %v", err)
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Parse payload
	var payload ClerkWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		log.Fatal("[CLERK WEBHOOK] failed parsing payload")
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	var clerkUserData ClerkUserData
	if err := json.Unmarshal(payload.Data, &clerkUserData); err != nil {
		log.Printf("Failed parsing user data: %v", err)
		http.Error(w, "Invalid user data", http.StatusBadRequest)
		return
	}

	// Subscribed events
	switch payload.Type {
	case "user.created":
		createUser(w, clerkUserData)
	case "user.updated":
		updateUser(w, clerkUserData)
	case "user.deleted":
		deleteUser(w, clerkUserData)
	default:
		log.Printf("Unhandled event: %s", payload.Type)
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"received"`))
}

func createUser(w http.ResponseWriter, userData ClerkUserData) {
	// connect to db
	log.Printf("[CLERK WEBHOOK] New user created: %s (%s)", userData.ID, userData.Email)
	w.WriteHeader(http.StatusCreated)
}

func updateUser(w http.ResponseWriter, userData ClerkUserData) {
	// connect to db
	log.Printf("[CLERK WEBHOOK] User updated: %s (%s)", userData.ID, userData.Email)
	w.WriteHeader(http.StatusOK)
}

func deleteUser(w http.ResponseWriter, userData ClerkUserData) {
	// connect to db
	log.Printf("[CLERK WEBHOOK] User deleted: %s", userData.ID)
	w.WriteHeader(http.StatusOK)
}
