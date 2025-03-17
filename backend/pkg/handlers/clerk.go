package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"math/big"
	"net/http"
	"os"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/internal/utils"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	svix "github.com/svix/svix-webhooks/go"
)

type ClerkUserPublicMetaData struct {
	DbId       int32   `json:"db_id"`
	Role       db.Role `json:"role"`
	UnitNumber int     `json:"unit_number"`
	// Admin(clerk_id) inviting tenant
	ManagementId string `json:"management_id"`
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
		createUser(w, r, clerkUserData, pool, queries)
	case "user.updated":
		updateUser(w, r, clerkUserData, queries)
	case "user.deleted":
		deleteUser(w, r, clerkUserData, queries)
	default:
		log.Printf("[CLERK_WEBHOOK] Unhandled event: %s", payload.Type)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"received"}`))
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

func createUser(w http.ResponseWriter, r *http.Request, userData ClerkUserData, pool *pgxpool.Pool, queries *db.Queries) {
	userRole := db.RoleTenant
	AdminFirstName := os.Getenv("ADMIN_FIRST_NAME")
	AdminLastName := os.Getenv("ADMIN_LAST_NAME")
	if AdminFirstName == "" || AdminLastName == "" {
		log.Println("[CLERK_WEBHOOK] Missing admin credentials")
		http.Error(w, "Missing admin credentials", http.StatusInternalServerError)
		return
	}

	if userData.FirstName == AdminFirstName && userData.LastName == AdminLastName {
		userRole = db.RoleAdmin
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
		http.Error(w, "Error converting JSON", http.StatusInternalServerError)
		return
	}

	// Transaction
	tx, err := pool.Begin(r.Context())
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed instablishing a database connection: %v", err)
		http.Error(w, "Error connecting to database", http.StatusInternalServerError)
		return
	}
	defer func() {
		if err != nil {
			tx.Rollback(r.Context())
		}
	}()

	qtx := queries.WithTx(tx)
	var apartmentUnitNumber int

	if userMetadata.ManagementId != "" && userMetadata.UnitNumber != 0 {
		log.Println("[CLERK_WEBHOOK] Invited user")
		adminPayload, err := user.Get(r.Context(), userMetadata.ManagementId)
		if err != nil {
			log.Printf("[CLERK_WEBHOOK] Failed querying for management ID: %v", err)
			http.Error(w, "Error querying managementId", http.StatusInternalServerError)
			return
		}

		var managementMetadata ClerkUserPublicMetaData
		err = json.Unmarshal(adminPayload.PublicMetadata, &managementMetadata)
		if err != nil {
			log.Printf("[CLERK_WEBHOOK] Failed converting JSON: %v", err)
			http.Error(w, "Error converting JSON", http.StatusInternalServerError)
			return
		}

		_, err = qtx.GetApartmentByUnitNumber(r.Context(), int16(userMetadata.UnitNumber))
		// Error out if apartment found
		if err == nil {
			log.Printf("[CLERK_WEBHOOK] Apartment already exists with unit number: %d", userMetadata.UnitNumber)
			http.Error(w, "Database error", http.StatusConflict)
			return
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			log.Printf("[CLERK_WEBHOOK] Error checking database for existing apartment: %v", err)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		// Create new apartment entry if no existing apartment with unit_number
		// NOTE: THis could be failing because not filling in all the way??
		// TODO: fix this
		apartmentRes, err := qtx.CreateApartment(r.Context(), db.CreateApartmentParams{
			UnitNumber:     int16(userMetadata.UnitNumber),
			Price:          pgtype.Numeric{Int: big.NewInt(350), Valid: true},
			Size:           2323,
			ManagementID:   int64(managementMetadata.DbId),
			Availability:   false,
			LeaseID:        2321,
			LeaseStartDate: pgtype.Date{Time: time.Now(), Valid: true},
			LeaseEndDate:   pgtype.Date{Time: time.Now(), Valid: true},
			UpdatedAt:      pgtype.Timestamp{Time: time.Now().UTC(), Valid: true},
			CreatedAt:      pgtype.Timestamp{Time: time.Now().UTC(), Valid: true},
		})
		if err != nil {
			log.Printf("[CLERK_WEBHOOK] Failed inserting apartment in DB: %v", err)
			http.Error(w, "Error inserting apartment", http.StatusInternalServerError)
			return
		}
		apartmentUnitNumber = int(apartmentRes.UnitNumber)
	}

	userRes, err := qtx.CreateUser(r.Context(), db.CreateUserParams{
		ClerkID:   userData.ID,
		FirstName: userData.FirstName,
		LastName:  userData.LastName,
		Email:     primaryUserEmail,
		UnitNumber: pgtype.Int2{
			Int16: int16(userMetadata.UnitNumber),
			Valid: true,
		},
		// Phone numbers are paid tier
		// Create a phone number generator
		Phone:    pgtype.Text{String: utils.CreatePhoneNumber(), Valid: true},
		Role:     userRole,
		ImageUrl: pgtype.Text{String: userData.ProfileImage, Valid: true},
		// LastLogin: pgtype.Timestamp{Time: time.Unix(userData.LastSignInAt, 0).UTC(), Valid: true},
		UpdatedAt: pgtype.Timestamp{Time: time.Now().UTC(), Valid: true},
		CreatedAt: pgtype.Timestamp{Time: time.Now().UTC(), Valid: true},
	})
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed inserting user in DB: %v", err)
		http.Error(w, "Error inserting user", http.StatusInternalServerError)
		return
	}
	err = tx.Commit(r.Context())
	if err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed committing transaction: %v", err)
		http.Error(w, "Error committing transaction", http.StatusInternalServerError)
		return
	}

	// Update clerk user metadata with DB ID, role, ect.
	metadata := &ClerkUserPublicMetaData{
		DbId:       int32(userRes.ID),
		Role:       userRes.Role,
		UnitNumber: apartmentUnitNumber,
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
	if err := queries.UpdateUser(r.Context(), db.UpdateUserParams{
		ClerkID:   userData.ID,
		FirstName: userData.FirstName,
		LastName:  userData.LastName,
		Email:     primaryUserEmail,
		ImageUrl:  pgtype.Text{String: userData.ProfileImage, Valid: true},
	}); err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed updating user %s: %v", userData.ID, err)
		http.Error(w, "Error updating user data", http.StatusInternalServerError)
		return
	}

	log.Printf("[CLERK_WEBHOOK] User updated: %s (%s)", userData.ID, primaryUserEmail)
	w.WriteHeader(http.StatusOK)
}

func deleteUser(w http.ResponseWriter, r *http.Request, userData ClerkUserData, queries *db.Queries) {
	if err := queries.DeleteUser(r.Context(), userData.ID); err != nil {
		log.Printf("[CLERK_WEBHOOK] Failed deleting user %s: %v", userData.ID, err)
		http.Error(w, "Error deleting user data", http.StatusInternalServerError)
		return

	}

	log.Printf("[CLERK_WEBHOOK] User deleted: %s", userData.ID)
	w.WriteHeader(http.StatusOK)
}
