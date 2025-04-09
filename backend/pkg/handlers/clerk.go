package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/internal/utils"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	svix "github.com/svix/svix-webhooks/go"
)

type ClerkUserPublicMetaData struct {
	DbId int32   `json:"db_id"`
	Role db.Role `json:"role"`
}

type EmailVerification struct {
	Status   string `json:"verified"`
	Strategy string `json:"strategy"`
}

type EmailEntry struct {
	Id           string            `json:"id"`
	EmailAddress string            `json:"email_address"`
	Verification EmailVerification `json:"verification"`
}

type ClerkUserData struct {
	ID                    string          `json:"id"`
	PrimaryEmailAddressId string          `json:"primary_email_address_id"`
	EmailAddresses        []EmailEntry    `json:"email_addresses"`
	FirstName             string          `json:"first_name"`
	LastName              string          `json:"last_name"`
	ProfileImage          string          `json:"profile_image_url"`
	LastSignInAt          int64           `json:"last_sign_in_at"`
	PublicMetaData        json.RawMessage `json:"public_metadata"`
}

type ClerkWebhookPayload struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

func ClerkWebhookHandler(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool, queries *db.Queries) {
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
		log.Printf("[CLERK_WEBHOOK] Unhandled event: %s", payload.Type)
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write([]byte(`{"status":"received"}`)); err != nil {
			log.Printf("[CLERK_WEBHOOK] Failed writing response: %v", err)
		}
		return
	}
}

func Verify(payload []byte, headers http.Header) bool {
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
		log.Printf("[CLERK_WEBHOOK] Invalid webhook signature: %v", err)
		return false
	}

	return true
}

func createUser(w http.ResponseWriter, r *http.Request, userData ClerkUserData, queries *db.Queries) {
	userRole := db.RoleTenant
	AdminFirstName := os.Getenv("ADMIN_FIRST_NAME")
	AdminLastName := os.Getenv("ADMIN_LAST_NAME")

	// Check if the database has any users first
	checkIfFirstUser := true
	if AdminFirstName == "" || AdminLastName == "" {
		log.Println("[CLERK_WEBHOOK] Warning: ADMIN_FIRST_NAME or ADMIN_LAST_NAME not set")
		// We'll continue and check if this is the first user in the system
	} else {
		if userData.FirstName == AdminFirstName && userData.LastName == AdminLastName {
			log.Printf("[CLERK_WEBHOOK] User matches admin name criteria: %s %s", userData.FirstName, userData.LastName)
			userRole = db.RoleAdmin
			checkIfFirstUser = false // We already know this is an admin
		}
	}

	// If we need to check if this is the first user
	if checkIfFirstUser {
		// Query to check if any users exist in the database
		userCount, err := queries.GetUserCount(r.Context())
		if err != nil {
			log.Printf("[CLERK_WEBHOOK] Error checking user count: %v", err)
			// Continue with tenant role as fallback
		} else if userCount == 0 {
			// If this is the first user, make them an admin
			log.Printf("[CLERK_WEBHOOK] First user detected, setting role to Admin: %s %s",
				userData.FirstName, userData.LastName)
			userRole = db.RoleAdmin
		}
	}

	var primaryUserEmail string
	for _, entry := range userData.EmailAddresses {
		if entry.Id == userData.PrimaryEmailAddressId {
			primaryUserEmail = entry.EmailAddress
			break
		}
	}
	if primaryUserEmail == "" {
		primaryUserEmail = userData.EmailAddresses[0].EmailAddress
	}

	var userMetadata ClerkUserPublicMetaData
	err := json.Unmarshal(userData.PublicMetaData, &userMetadata)
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed converting JSON: %v", err)
		// Continue anyway, as the JSON might be empty for new users
		userMetadata = ClerkUserPublicMetaData{}
	}

	//NOTE:
	// For our first seeded admin
	// so we can User there database ID for
	// new tenant apartment entrys
	//
	if userMetadata.Role == db.RoleAdmin {
		userRole = db.RoleAdmin
	}

	userRes, err := queries.CreateUser(r.Context(), db.CreateUserParams{
		ClerkID:   userData.ID,
		FirstName: userData.FirstName,
		LastName:  userData.LastName,
		Email:     primaryUserEmail,
		Phone:     pgtype.Text{String: utils.CreatePhoneNumber(), Valid: true},
		Role:      userRole,
	})
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed inserting user in DB: %v", err)
		http.Error(w, "Error inserting user", http.StatusInternalServerError)
		return
	}

	// Update clerk user metadata with DB ID, role, ect.
	metadata := &ClerkUserPublicMetaData{
		DbId: int32(userRes.ID),
		Role: userRes.Role,
	}

	// Convert metadata to raw json
	metadataBytes, err := json.Marshal(metadata)
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Error updating user with db credintials: %v", err)
		metadataBytes = []byte("{}")
	}
	metadataRaw := json.RawMessage(metadataBytes)

	_, err = user.Update(r.Context(), userData.ID, &user.UpdateParams{
		PublicMetadata: &metadataRaw,
	})
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Error could not update user metadata: %v", err)
		// Currently not erroring out
	}

	log.Printf("[CLERK_WEBHOOK] New user created: %s (%s)", userData.ID, primaryUserEmail)
	w.WriteHeader(http.StatusCreated)
}

func updateUser(w http.ResponseWriter, r *http.Request, userData ClerkUserData, queries *db.Queries) {
	primaryUserEmail := userData.EmailAddresses[0].EmailAddress

	// First, check if the user exists in our database
	existingUser, err := queries.GetUser(r.Context(), userData.ID)
	if err != nil {
		// User doesn't exist yet - create the user instead of updating
		log.Printf("[CLERK_WEBHOOK] User %s not found, creating new user instead of updating", userData.ID)

		// Call createUser to handle the creation logic
		createUser(w, r, userData, queries)
		return
	}

	// Extract role from clerk metadata if present
	var userRole db.Role = existingUser.Role // Default to existing role in database
	var userMetadata ClerkUserPublicMetaData
	
	if err := json.Unmarshal(userData.PublicMetaData, &userMetadata); err == nil {
		// Successfully parsed metadata
		if userMetadata.Role != "" {
			// If metadata has a role, use it
			userRole = userMetadata.Role
			log.Printf("[CLERK_WEBHOOK] Found role in Clerk metadata: %s", userRole)
		}
	} else {
		log.Printf("[CLERK_WEBHOOK] Warning: Failed to parse metadata for user %s: %v", userData.ID, err)
	}

	// Check if DB ID in Clerk metadata is correct
	if userMetadata.DbId != int32(existingUser.ID) {
		log.Printf("[CLERK_WEBHOOK] DB ID mismatch - Clerk: %d, DB: %d. Will update metadata.",
			userMetadata.DbId, existingUser.ID)
			
		// Update Clerk metadata with correct DB ID and role
		metadataUpdate := ClerkUserPublicMetaData{
			DbId: int32(existingUser.ID),
			Role: userRole,
		}
		
		metadataBytes, err := json.Marshal(metadataUpdate)
		if err != nil {
			log.Printf("[CLERK_WEBHOOK] Error marshaling metadata: %v", err)
		} else {
			metadataRaw := json.RawMessage(metadataBytes)
			_, updateErr := user.Update(r.Context(), userData.ID, &user.UpdateParams{
				PublicMetadata: &metadataRaw,
			})
			
			if updateErr != nil {
				log.Printf("[CLERK_WEBHOOK] Error updating Clerk metadata: %v", updateErr)
			} else {
				log.Printf("[CLERK_WEBHOOK] Successfully updated Clerk metadata with DB ID and role")
			}
		}
	}

	// If user exists, proceed with update - including role from metadata
	log.Printf("[CLERK_WEBHOOK] Updating existing user %s (%s) with role %s", 
		userData.ID, primaryUserEmail, userRole)

	// We need to maintain the existing phone if it wasn't changed
	phoneToUse := existingUser.Phone
	
	if err := queries.UpdateUser(r.Context(), db.UpdateUserParams{
		ClerkID:   userData.ID,
		FirstName: userData.FirstName,
		LastName:  userData.LastName,
		Email:     primaryUserEmail,
		Phone:     phoneToUse,
		Role:      userRole,
	}); err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed updating user %s: %v", userData.ID, err)
		http.Error(w, "Error updating user data", http.StatusInternalServerError)
		return
	}

	log.Printf("[CLERK_WEBHOOK] User updated: %s (%s) with role %s", 
		userData.ID, primaryUserEmail, userRole)
	w.WriteHeader(http.StatusOK)
}

func deleteUser(w http.ResponseWriter, r *http.Request, userData ClerkUserData, queries *db.Queries) {
	if err := queries.DeleteUser(r.Context(), userData.ID); err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed deleting user %s: %v", userData.ID, err)
		http.Error(w, "Error deleting user data", http.StatusInternalServerError)
		return

	}

	// TODO: DELETE tenat's lease, parking_permits, lockers, ect

	w.WriteHeader(http.StatusOK)
}
