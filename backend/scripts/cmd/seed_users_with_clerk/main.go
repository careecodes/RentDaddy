// Package main provides functionality to seed users in the database using Clerk authentication
// and also seeds additional data (lockers, complaints, work orders)
//
// IMPORTANT: This script requires the CLERK_SECRET_KEY environment variable to be set.
// Without this key, the script will fail to run as it cannot authenticate with Clerk API.
//
// This script:
// 1. Synchronizes users with Clerk authentication service
// 2. Creates and manages admin/tenant users
// 3. Seeds lockers for each tenant
// 4. Creates random work orders for sample users
// 5. Creates random complaints for sample users
//
// Other helpful environment variables:
// - ADMIN_EMAIL: Email address for the primary admin user (fallback: SMTP_FROM)
// - ADMIN_FIRST_NAME: First name for admin user
// - ADMIN_LAST_NAME: Last name for admin user
// - ADMIN_CLERK_ID: Clerk ID for admin user (optional, will try to find by email)
// - SCRIPT_MODE: Set to "true" when running in script/task context without user authentication
//   This allows for more resilient operation when environment variables can't be verified
//
// Example usage:
// CLERK_SECRET_KEY=sk_test_xyz ADMIN_EMAIL=admin@example.com go run scripts/cmd/seed_users_with_clerk/main.go scripts/cmd/seed_users_with_clerk/seed_users.go
//
// Example usage in script mode:
// CLERK_SECRET_KEY=sk_test_xyz ADMIN_EMAIL=admin@example.com SCRIPT_MODE=true go run scripts/cmd/seed_users_with_clerk/main.go scripts/cmd/seed_users_with_clerk/seed_users.go
package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	utils "github.com/careecodes/RentDaddy/internal/utils"
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
	// Get admin email from environment variables
	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = os.Getenv("SMTP_FROM")
	}
	
	// Check if this is the main admin we're looking for
	isTargetAdmin := false
	
	// Get user's email
	userEmail := ""
	if len(clerkU.EmailAddresses) > 0 {
		userEmail = clerkU.EmailAddresses[0].EmailAddress
	}
	
	// Check if this user is our target admin by email
	if adminEmail != "" && userEmail == adminEmail {
		isTargetAdmin = true
		log.Printf("[SEED_USERS] Found user with admin email: %s (ID: %s)", adminEmail, clerkU.ID)
	}
	
	// Skip if this is the admin being processed separately, but only if not our target admin
	if clerkU.ID == adminClerkID && !isTargetAdmin {
		return false, nil // Skip admin, already processed
	}

	// Check if user already exists in database by Clerk ID
	existingUser, err := queries.GetUser(ctx, clerkU.ID)
	if err == nil {
		// User exists, check metadata
		var meta ClerkUserPublicMetaData
		metaErr := json.Unmarshal(clerkU.PublicMetadata, &meta)
		if metaErr != nil {
			log.Printf("[SEED_USERS] Warning: Failed to parse metadata for user %s: %v", clerkU.ID, metaErr)
			// Continue anyway, using default values
		}
		
		// If this is our target admin, ensure they have admin role
		if isTargetAdmin && existingUser.Role != db.RoleAdmin {
			log.Printf("[SEED_USERS] User %s has admin email but role is %s. Updating to admin.", 
				clerkU.ID, existingUser.Role)
				
			// Update user role to admin
			err := queries.UpdateUser(ctx, db.UpdateUserParams{
				ClerkID:   clerkU.ID,
				FirstName: existingUser.FirstName,
				LastName:  existingUser.LastName,
				Email:     existingUser.Email,
				Phone:     existingUser.Phone,
			})
			if err != nil {
				log.Printf("[SEED_USERS] Failed to update user role: %v", err)
			} else {
				log.Printf("[SEED_USERS] Successfully updated user to admin role")
			}
		}

		// Update Clerk metadata if necessary
		if meta.DbId != int32(existingUser.ID) {
			log.Printf("[SEED_USERS] Updating metadata for user %s (DB ID: %d)", clerkU.ID, existingUser.ID)
			
			// Set proper role in metadata
			role := existingUser.Role
			if isTargetAdmin {
				role = db.RoleAdmin
			}
			
			if err := updateClerkMetadata(ctx, clerkU.ID, int32(existingUser.ID), role); err != nil {
				log.Printf("[SEED_USERS] Failed to update Clerk metadata for %s: %v", clerkU.ID, err)
			} else {
				log.Printf("[SEED_USERS] Successfully updated Clerk metadata with DB ID %d for user %s", 
					existingUser.ID, clerkU.ID)
			}
		}
		return false, nil
	} else {
		log.Printf("[SEED_USERS] No existing user found in database for Clerk ID %s, creating new user", clerkU.ID)
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

	// Create the user in database
	log.Printf("[SEED_USERS] Creating new user in database: ClerkID=%s, Name=%s %s, Email=%s, Role=%s", 
		clerkU.ID, first, last, email, role)
		
	created, err := queries.CreateUser(ctx, db.CreateUserParams{
		ClerkID:   clerkU.ID,
		FirstName: first,
		LastName:  last,
		Email:     email,
		Phone:     phone,
		Role:      role,
	})
	if err != nil {
		log.Printf("[SEED_USERS] ❌ Failed inserting Clerk user %s: %v", clerkU.ID, err)
		return false, err
	}

	log.Printf("[SEED_USERS] ✅ Successfully inserted Clerk user %s into DB with ID %d", clerkU.ID, created.ID)

	// Update Clerk metadata with new DB ID
	log.Printf("[SEED_USERS] Updating Clerk metadata with DB ID %d for user %s", created.ID, clerkU.ID)
	if err := updateClerkMetadata(ctx, clerkU.ID, int32(created.ID), role); err != nil {
		log.Printf("[SEED_USERS] ⚠️ Failed to update Clerk metadata for %s: %v", clerkU.ID, err)
	} else {
		log.Printf("[SEED_USERS] ✅ Successfully updated Clerk metadata for user %s", clerkU.ID)
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

	// Try to find the admin Clerk ID
	adminClerkID := os.Getenv("ADMIN_CLERK_ID")
	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = os.Getenv("SMTP_FROM")
	}
	
	// Check if this is running in a script/task (unauthenticated) context
	isScriptMode := os.Getenv("SCRIPT_MODE") == "true"
	
	// If we don't have an admin Clerk ID but we have an admin email,
	// try to find the Clerk ID by looking up the email
	if adminClerkID == "" && adminEmail != "" {
		log.Printf("[SEED_USERS] No ADMIN_CLERK_ID set, looking up user by email: %s", adminEmail)
		
		// List Clerk users and find by email
		userList, err := clerkuser.List(ctx, nil)
		if err == nil {
			for _, user := range userList.Users {
				for _, email := range user.EmailAddresses {
					if email.EmailAddress == adminEmail {
						adminClerkID = user.ID
						log.Printf("[SEED_USERS] Found user with matching email %s, using Clerk ID: %s", 
							adminEmail, adminClerkID)
						break
					}
				}
				if adminClerkID != "" {
					break
				}
			}
		}
		
		// If still not found and we have admin details, consider creating a new user
		if adminClerkID == "" && isScriptMode {
			adminFirst := os.Getenv("ADMIN_FIRST_NAME")
			adminLast := os.Getenv("ADMIN_LAST_NAME")
			
			if adminFirst != "" && adminLast != "" && adminEmail != "" {
				log.Printf("[SEED_USERS] Creating new admin user in script mode: %s %s <%s>", 
					adminFirst, adminLast, adminEmail)
				
				// This will create a new admin user with the provided details
				admin, err := createAdmin(ctx)
				if err != nil {
					log.Printf("[SEED_USERS] Failed to create admin user: %v", err)
				} else if admin != nil {
					adminClerkID = admin.ID
					log.Printf("[SEED_USERS] Created new admin user with Clerk ID: %s", adminClerkID)
				}
			}
		}
	}
	
	// If we still don't have an admin Clerk ID and not in script mode, this is a serious issue
	if adminClerkID == "" && !isScriptMode {
		log.Fatal("[SEED_USERS] No ADMIN_CLERK_ID found, either set this environment variable or set ADMIN_EMAIL to the email of an existing Clerk user")
	} else if adminClerkID == "" {
		// In script mode, we can generate a placeholder for testing
		adminClerkID = "script_admin_placeholder_id"
		log.Printf("[SEED_USERS] Using placeholder admin ID in script mode: %s", adminClerkID)
	}

	pgURL := os.Getenv("PG_URL")
	pool, err := pgxpool.New(ctx, pgURL)
	if err != nil {
		log.Fatalf("[SEED_USERS] Failed to connect to Postgres: %v", err)
	}
	defer pool.Close()
	queries := db.New(pool)

	// Get admin email from environment variables
	adminEmail = os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = os.Getenv("SMTP_FROM")
	}
	
	// First, check if we need to clean up existing admin entries to ensure proper priority
	if adminEmail != "" {
		log.Printf("[SEED_USERS] Checking existing admin users with target email: %s", adminEmail)
		
		// List existing admins in the database
		existingAdmins, err := queries.ListUsersByRole(ctx, db.RoleAdmin)
		if err != nil {
			log.Printf("[SEED_USERS] Warning: Failed to list existing admins: %v", err)
		} else if len(existingAdmins) > 0 {
			var foundAdminWithEmail bool
			var adminPosition int
			
			// Look for admin with the target email
			for i, admin := range existingAdmins {
				if admin.Email == adminEmail {
					foundAdminWithEmail = true
					adminPosition = i
					log.Printf("[SEED_USERS] Found admin with target email %s at position %d (ID=%d)", 
						adminEmail, i, admin.ID)
					break
				}
			}
			
			// If admin with target email exists but is not the first admin (position > 0),
			// we'll need to make sure it's processed first
			if foundAdminWithEmail && adminPosition > 0 {
				log.Printf("[SEED_USERS] Admin with target email exists but is not first in list. Will prioritize.")
			}
		}
	}

	// Get Clerk user info for admin
	clerkUser, err := clerkuser.Get(ctx, adminClerkID)
	if err != nil {
		log.Fatalf("[SEED_USERS] Clerk user fetch failed: %v", err)
	}

	// Compare emails to see if this is the target admin
	clerkUserEmail := ""
	if len(clerkUser.EmailAddresses) > 0 {
		clerkUserEmail = clerkUser.EmailAddresses[0].EmailAddress
	}
	
	isTargetAdmin := adminEmail != "" && clerkUserEmail == adminEmail
	
	if isTargetAdmin {
		log.Printf("[SEED_USERS] ✅ Processing PRIMARY admin: %s (matches target email)", clerkUserEmail)
	} else {
		log.Printf("[SEED_USERS] Processing admin: %s (does not match target email: %s)", 
			clerkUserEmail, adminEmail)
	}

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

	// First, get a list of all users from Clerk - iterate through pages to get all users
	totalUsers := 0
	processedUsers := 0
	existingUsers := 0

	// First, check for users with admin email - we want to prioritize these
	adminEmail = os.Getenv("ADMIN_EMAIL")
	if adminEmail != "" {
		log.Printf("[SEED_USERS] Looking for existing users with admin email: %s", adminEmail)
		
		// Pre-scan for admin users by email
		listParams := &clerkuser.ListParams{
			ListParams: clerk.ListParams{
				Limit: func(v int) *int64 { val := int64(v); return &val }(100), // Large limit to find all
			},
		}
		
		userList, err := clerkuser.List(ctx, listParams)
		if err == nil {
			foundAdminEmail := false
			
			for _, clerkU := range userList.Users {
				// Skip empty or invalid users
				if clerkU.ID == "" {
					continue
				}
				
				for _, email := range clerkU.EmailAddresses {
					if email.EmailAddress == adminEmail {
						log.Printf("[SEED_USERS] ✅ Found user with admin email %s, ID: %s - will process this user first", 
							adminEmail, clerkU.ID)
						
						isNew, err := processClerkUser(ctx, clerkU, queries, adminClerkID)
						if err != nil {
							log.Printf("[SEED_USERS] ❌ Error processing admin user %s: %v", clerkU.ID, err)
						} else {
							log.Printf("[SEED_USERS] ✅ Successfully processed admin user: %s", clerkU.ID)
							if isNew {
								processedUsers++
							} else {
								existingUsers++
							}
						}
						
						foundAdminEmail = true
						break
					}
				}
				
				if foundAdminEmail {
					break
				}
			}
			
			if !foundAdminEmail {
				log.Printf("[SEED_USERS] ⚠️ No existing user found with admin email: %s", adminEmail)
			}
		}
	}
	
	// Store pagination parameters
	limit := 15 // Larger limit to reduce number of API calls

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

		log.Printf("[SEED_USERS] Got page %d with %d users (offset: %d, total fetched so far: %d)", 
			page, len(userList.Users), (page-1)*limit, totalUsers + len(userList.Users))

		// Sort users before processing - admin email first, then other users
		var priorityUsers []*clerk.User
		var regularUsers []*clerk.User
		
		// First pass: sort users into priority and regular
		for _, clerkU := range userList.Users {
			if clerkU.ID == "" {
				continue
			}
			
			// Get email for this user
			email := ""
			if len(clerkU.EmailAddresses) > 0 {
				email = clerkU.EmailAddresses[0].EmailAddress
			}
			
			// Prioritize users with the admin email
			if adminEmail != "" && email == adminEmail {
				log.Printf("[SEED_USERS] Found user with admin email %s - marking as priority", email)
				priorityUsers = append(priorityUsers, clerkU)
			} else {
				regularUsers = append(regularUsers, clerkU)
			}
		}
		
		// Fallback: If no priority users found but admin email is set, log a warning
		if len(priorityUsers) == 0 && adminEmail != "" {
			log.Printf("[SEED_USERS] ⚠️ No users found with admin email %s in Clerk directory", adminEmail)
			log.Printf("[SEED_USERS] Will continue with normal user processing")
		}
		
		// Process priority users first
		for _, clerkU := range priorityUsers {
			totalUsers++
			
			email := ""
			if len(clerkU.EmailAddresses) > 0 {
				email = clerkU.EmailAddresses[0].EmailAddress
			}
			
			log.Printf("[SEED_USERS] ⭐ Processing PRIORITY user with admin email: %s", email)
			
			isNew, err := processClerkUser(ctx, clerkU, queries, adminClerkID)
			if err != nil {
				log.Printf("[SEED_USERS] ❌ Error processing admin user %s: %v", clerkU.ID, err)
			} else if isNew {
				log.Printf("[SEED_USERS] ✅ Created new admin user in database: %s", clerkU.ID)
				processedUsers++
			} else {
				log.Printf("[SEED_USERS] ℹ️ Admin user already exists in database: %s", clerkU.ID)
				existingUsers++
			}
		}
		
		// Process regular users
		for _, clerkU := range regularUsers {
			totalUsers++
			
			// Get primary email for logging
			email := ""
			if len(clerkU.EmailAddresses) > 0 {
				email = clerkU.EmailAddresses[0].EmailAddress
			}
			
			log.Printf("[SEED_USERS] Processing regular user ID: %s, Email: %s", clerkU.ID, email)
			
			isNew, err := processClerkUser(ctx, clerkU, queries, adminClerkID)
			if err != nil {
				log.Printf("[SEED_USERS] ❌ Error processing user %s: %v", clerkU.ID, err)
			} else if isNew {
				log.Printf("[SEED_USERS] ✅ Created new user in database: %s", clerkU.ID)
				processedUsers++
			} else {
				log.Printf("[SEED_USERS] ℹ️ User already exists in database: %s", clerkU.ID)
				existingUsers++
			}
		}

		// Check if we've reached the end of the pages
		if len(userList.Users) < limit {
			break
		}
	}

	log.Printf("[SEED_USERS] Summary: Found %d total Clerk users, added %d new users to database, %d existing users skipped", 
		totalUsers, processedUsers, existingUsers)

	log.Println("[SEED_USERS] Waiting for Clerk sync...")
	log.Printf("[SEED_USERS] Sleeping for 6 seconds to allow Clerk webhook events to process...")
	time.Sleep(6 * time.Second)

	// Check if any tenants exist in DB after Clerk sync
	tenants, err := queries.ListUsersByRole(ctx, db.RoleTenant)
	if err != nil {
		log.Printf("[SEED_USERS] Failed checking tenant count: %v", err)
		return
	}
	
	// Define constants for tenant seeding
	const MAX_TENANTS = 20          // Maximum number of tenants to create
	const BATCH_SIZE = 10           // Number of tenants to create in each batch
	const INITIAL_TENANTS = 3       // Number of tenants to create initially if none exist
	
	// Case 1: No tenants exist - create initial set
	if len(tenants) == 0 {
		log.Println("[SEED_USERS] No tenants found after Clerk sync, creating initial tenants...")
		for i := 0; i < INITIAL_TENANTS; i++ {
			if err := createTenant(ctx); err != nil {
				log.Printf("[SEED_USERS] Tenant %d failed: %v", i+1, err)
			} else {
				log.Printf("[SEED_USERS] Created initial tenant %d", i+1)
			}
		}
		return
	}
	
	// Case 2: We have tenants but less than the maximum - check if all have leases
	if len(tenants) < MAX_TENANTS {
		log.Printf("[SEED_USERS] %d tenants found, checking for tenants without leases...", len(tenants))
		
		// Check for tenants without leases by querying the database
		// This query gets the count of tenants that don't have a lease entry
		var tenantsWithoutLeaseCount int
		err := pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM users 
			WHERE role = 'tenant' 
			AND id NOT IN (SELECT tenant_id FROM leases)
		`).Scan(&tenantsWithoutLeaseCount)
		
		if err != nil {
			log.Printf("[SEED_USERS] Error checking tenants without leases: %v", err)
			return
		}
		
		log.Printf("[SEED_USERS] Found %d tenants without leases", tenantsWithoutLeaseCount)
		
		// If all tenants have leases and we're below the maximum, create a new batch
		if tenantsWithoutLeaseCount == 0 {
			// Calculate how many tenants to create (up to BATCH_SIZE, but not exceeding MAX_TENANTS)
			toCreate := BATCH_SIZE
			if len(tenants) + toCreate > MAX_TENANTS {
				toCreate = MAX_TENANTS - len(tenants)
			}
			
			if toCreate > 0 {
				log.Printf("[SEED_USERS] All existing tenants have leases. Creating %d more tenants...", toCreate)
				
				for i := 0; i < toCreate; i++ {
					if err := createTenant(ctx); err != nil {
						log.Printf("[SEED_USERS] Additional tenant %d failed: %v", i+1, err)
					} else {
						log.Printf("[SEED_USERS] Created additional tenant %d of %d", i+1, toCreate)
					}
				}
			} else {
				log.Printf("[SEED_USERS] Maximum tenant limit (%d) reached, not creating more tenants", MAX_TENANTS)
			}
		} else {
			log.Printf("[SEED_USERS] Some tenants still don't have leases. Not creating more tenants until all have leases")
		}
	} else {
		log.Printf("[SEED_USERS] Maximum number of tenants (%d) already reached", MAX_TENANTS)
	}

	// Call utils.SeedDB to seed additional data:
	// - Creates lockers for each tenant user
	// - Creates random work orders for sample users
	// - Creates random complaints for sample users
	log.Println("[SEED_USERS] Seeding additional data (lockers, complaints, work orders)...")
	if err := utils.SeedDB(queries, pool, adminID); err != nil {
		log.Fatalf("[SEED_USERS] SeedDB failed: %v", err)
	}
	log.Println("[SEED_USERS] Data seeding complete")
}
