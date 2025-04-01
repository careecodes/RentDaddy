package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/internal/utils"
	clerk "github.com/clerk/clerk-sdk-go/v2"
	clerkuser "github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// updateClerkMetadata updates a Clerk user's metadata with the correct DB ID
func updateClerkMetadata(ctx context.Context, clerkID string, dbID int32, role db.Role) error {
	updatedMeta := ClerkUserPublicMetaData{
		DbId: dbID,
		Role: Role(role),
	}
	metaBytes, _ := json.Marshal(updatedMeta)
	_, err := clerkuser.Update(ctx, clerkID, &clerkuser.UpdateParams{
		PublicMetadata: (*json.RawMessage)(&metaBytes),
	})
	return err
}

// processClerkUser synchronizes a Clerk user with the database
func processClerkUser(ctx context.Context, clerkU *clerk.User, queries *db.Queries, adminClerkID string) (bool, error) {
	if clerkU.ID == adminClerkID {
		return false, nil // Skip admin, already processed
	}

	// Check if user already exists in database
	existingUser, err := queries.GetUser(ctx, clerkU.ID)
	if err == nil {
		// User exists, check metadata
		var meta ClerkUserPublicMetaData
		_ = json.Unmarshal(clerkU.PublicMetadata, &meta)

		// Update Clerk metadata if necessary
		if meta.DbId != int32(existingUser.ID) {
			log.Printf("[SEED_USERS] Updating metadata for user %s", clerkU.ID)
			if err := updateClerkMetadata(ctx, clerkU.ID, int32(existingUser.ID), existingUser.Role); err != nil {
				log.Printf("[SEED_USERS] Failed to update Clerk metadata for %s: %v", clerkU.ID, err)
			}
		}
		return false, nil
	}

	// User doesn't exist, create new
	first := deref(clerkU.FirstName)
	last := deref(clerkU.LastName)
	email := ""
	if len(clerkU.EmailAddresses) > 0 {
		email = clerkU.EmailAddresses[0].EmailAddress
	}
	phone := pgtype.Text{String: "", Valid: true}
	role := db.RoleTenant // Default role is tenant

	// Check if role is specified in metadata
	var meta ClerkUserPublicMetaData
	_ = json.Unmarshal(clerkU.PublicMetadata, &meta)
	if meta.Role != "" {
		// Convert the Role type from metadata to db.Role
		roleStr := string(meta.Role)
		if roleStr == "admin" {
			role = db.RoleAdmin
		} else if roleStr == "tenant" {
			role = db.RoleTenant
		} else if roleStr == "landlord" {
			role = db.RoleAdmin // Note: mapping landlord to admin as per your example
		}
	}

	created, err := queries.CreateUser(ctx, db.CreateUserParams{
		ClerkID:   clerkU.ID,
		FirstName: first,
		LastName:  last,
		Email:     email,
		Phone:     phone,
		Role:      role,
	})
	if err != nil {
		log.Printf("[SEED_USERS] Failed inserting Clerk user %s: %v", clerkU.ID, err)
		return false, err
	}

	log.Printf("[SEED_USERS] Inserted Clerk user %s into DB with ID %d", clerkU.ID, created.ID)

	// Update Clerk metadata with new DB ID
	if err := updateClerkMetadata(ctx, clerkU.ID, int32(created.ID), role); err != nil {
		log.Printf("[SEED_USERS] Failed to update Clerk metadata for %s: %v", clerkU.ID, err)
	}

	return true, nil
}

func main() {
	ctx := context.Background()
	clerkSecretKey := os.Getenv("CLERK_SECRET_KEY")
	if clerkSecretKey == "" {
		log.Fatal("[SEED_USERS] Missing CLERK_SECRET_KEY")
	}
	clerk.SetKey(clerkSecretKey)

	adminClerkID := os.Getenv("ADMIN_CLERK_ID")
	if adminClerkID == "" {
		log.Fatal("[SEED_USERS] Missing ADMIN_CLERK_ID")
	}

	pgURL := os.Getenv("PG_URL")
	pool, err := pgxpool.New(ctx, pgURL)
	if err != nil {
		log.Fatalf("[SEED_USERS] Failed to connect to Postgres: %v", err)
	}
	defer pool.Close()
	queries := db.New(pool)

	// Get Clerk user info
	clerkUser, err := clerkuser.Get(ctx, adminClerkID)
	if err != nil {
		log.Fatalf("[SEED_USERS] Clerk user fetch failed: %v", err)
	}

	log.Printf("[SEED_USERS] Processing admin: %s", clerkUser.EmailAddresses[0].EmailAddress)

	var adminID int32

	// First, check if the admin already exists in the database by Clerk ID
	existingUser, err := queries.GetUser(ctx, clerkUser.ID)
	if err == nil {
		// Admin already exists in database
		adminID = int32(existingUser.ID)
		log.Printf("[SEED_USERS] Admin found in database with ID: %d", adminID)

		// Parse metadata to check if it needs updating
		var metadata ClerkUserPublicMetaData
		_ = json.Unmarshal(clerkUser.PublicMetadata, &metadata)

		// Update Clerk metadata if necessary
		if metadata.DbId != adminID {
			log.Printf("[SEED_USERS] Updating Clerk metadata with correct DB ID %d", adminID)
			if err := updateClerkMetadata(ctx, clerkUser.ID, adminID, db.RoleAdmin); err != nil {
				log.Printf("[SEED_USERS] Failed to update Clerk metadata: %v", err)
			}
		}
	} else {
		// Admin doesn't exist in database, create new user and let DB assign ID
		log.Printf("[SEED_USERS] Admin not found in database, creating new user")
		created, err := queries.CreateUser(ctx, db.CreateUserParams{
			ClerkID:   clerkUser.ID,
			FirstName: deref(clerkUser.FirstName),
			LastName:  deref(clerkUser.LastName),
			Email:     clerkUser.EmailAddresses[0].EmailAddress,
			Phone:     pgtype.Text{String: "", Valid: true},
			Role:      db.RoleAdmin,
		})
		if err != nil {
			log.Fatalf("[SEED_USERS] Failed to create admin user: %v", err)
		}
		adminID = int32(created.ID)
		log.Printf("[SEED_USERS] Created admin with DB ID: %d", adminID)

		// Update Clerk metadata with new DB ID
		if err := updateClerkMetadata(ctx, clerkUser.ID, adminID, db.RoleAdmin); err != nil {
			log.Printf("[SEED_USERS] Failed to update Clerk metadata: %v", err)
		}
	}

	log.Println("[SEED_USERS] Syncing all Clerk users to database...")

	// First, get a list of all users - iterate through pages to get all users
	totalUsers := 0
	processedUsers := 0

	// Store pagination parameters
	limit := 10 // Larger limit to reduce number of API calls

	// We'll handle Clerk API pagination properly
	for page := 1; ; page++ {
		// Get the user list with pagination
		listParams := &clerkuser.ListParams{
			ListParams: clerk.ListParams{
				Limit: func(v int) *int64 { val := int64(v); return &val }(limit),
			},
		}

		if page > 1 {
			// For pages after the first, use offset
			offset := (page - 1) * limit
			offset64 := int64(offset)
			listParams.Offset = &offset64
		}

		userList, err := clerkuser.List(ctx, listParams)
		if err != nil {
			log.Printf("[SEED_USERS] Failed to list Clerk users (page %d): %v", page, err)
			break
		}

		if len(userList.Users) == 0 {
			break // No more users
		}

		log.Printf("[SEED_USERS] Got page %d with %d users", page, len(userList.Users))

		// Process users on this page
		for _, clerkU := range userList.Users {
			totalUsers++
			isNew, err := processClerkUser(ctx, clerkU, queries, adminClerkID)
			if err == nil && isNew {
				processedUsers++
			}
		}

		// Check if we've reached the end of the pages
		if len(userList.Users) < limit {
			break
		}
	}

	log.Printf("[SEED_USERS] Found %d total users, processed %d new users", totalUsers, processedUsers)

	log.Println("[SEED_USERS] Waiting for Clerk sync...")
	log.Printf("[SEED_USERS] Sleeping for 6 seconds to allow Clerk webhook events to process...")
	time.Sleep(6 * time.Second)

	// Check if any tenants exist in DB after Clerk sync
	tenants, err := queries.ListUsersByRole(ctx, db.RoleTenant)
	if err != nil {
		log.Printf("[SEED_USERS] Failed checking tenant count: %v", err)
	} else if len(tenants) == 0 {
		log.Println("[SEED_USERS] No tenants found after Clerk sync, creating demo tenants...")
		for i := 0; i < 3; i++ {
			if err := createTenant(ctx); err != nil {
				log.Printf("[SEED_USERS] Tenant %d failed: %v", i+1, err)
			}
		}
	} else {
		log.Printf("[SEED_USERS] %d tenants found — skipping tenant seeding", len(tenants))
	}

	if err := utils.SeedDB(queries, pool, adminID); err != nil {
		log.Fatalf("[SEED_USERS] SeedDB failed: %v", err)
	}
	log.Println("[SEED_USERS] Seeding complete")
}
