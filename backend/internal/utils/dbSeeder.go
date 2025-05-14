package utils

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/go-faker/faker/v4"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Use a package-level random source that's properly seeded
var r = rand.New(rand.NewSource(time.Now().UnixNano()))

func RandomWorkCategory() db.WorkCategory {
	categories := []db.WorkCategory{
		db.WorkCategoryPlumbing,
		db.WorkCategoryElectric,
		db.WorkCategoryCarpentry,
		db.WorkCategoryHvac,
		db.WorkCategoryOther,
	}

	return categories[r.Intn(len(categories))]
}

func RandomComplaintCategory() db.ComplaintCategory {
	categories := []db.ComplaintCategory{
		db.ComplaintCategoryNoise,
		db.ComplaintCategoryMaintenance,
		db.ComplaintCategoryOther,
	}

	return categories[r.Intn(len(categories))]
}

func RandomStatus() db.Status {
	statuses := []db.Status{
		db.StatusClosed,
		db.StatusInProgress,
		db.StatusOpen,
		db.StatusResolved,
	}

	return statuses[r.Intn(len(statuses))]
}

func createWorkOrders(queries *db.Queries, user db.User, ctx context.Context) error {
	// Use the CountWorkOrdersByUser function from generated queries
	existingCount, err := queries.CountWorkOrdersByUser(ctx, user.ID)
	if err != nil {
		log.Printf("[SEEDER] Failed to get existing work order count: %v", err)
		// Continue anyway, assuming no work orders exist
		existingCount = 0
	}

	// Set a reasonable maximum number of work orders per tenant
	const MAX_WORK_ORDERS_PER_TENANT int64 = 5

	// If tenant already has maximum work orders, skip
	if existingCount >= MAX_WORK_ORDERS_PER_TENANT {
		log.Printf("[SEEDER] Tenant ID %d already has %d work orders (max: %d), skipping",
			user.ID, existingCount, MAX_WORK_ORDERS_PER_TENANT)
		return nil
	}

	// Create random number of work orders (1-3) but don't exceed maximum
	orderCount := int64(r.Intn(3) + 1)
	if existingCount+orderCount > MAX_WORK_ORDERS_PER_TENANT {
		orderCount = MAX_WORK_ORDERS_PER_TENANT - existingCount
	}

	log.Printf("[SEEDER] Creating %d work orders for tenant ID %d (currently has %d)",
		orderCount, user.ID, existingCount)

	for i := int64(0); i < orderCount; i++ {
		order, err := queries.CreateWorkOrder(context.Background(), db.CreateWorkOrderParams{
			CreatedBy:   user.ID,
			Category:    RandomWorkCategory(),
			Title:       faker.Sentence(),
			Description: faker.Paragraph(),
		})
		if err != nil {
			return fmt.Errorf("[SEEDER] error creating work order: %v", err.Error())
		}
		log.Printf("[SEEDER] Work order created for tenant ID %d: %d", user.ID, order.ID)
	}

	log.Printf("[SEEDER] Work orders seeded successfully for tenant ID %d (%d total)",
		user.ID, existingCount+orderCount)
	return nil
}

func createComplaints(queries *db.Queries, user db.User, ctx context.Context) error {
	// Use the CountComplaintsByUser function from generated queries
	existingCount, err := queries.CountComplaintsByUser(ctx, user.ID)
	if err != nil {
		log.Printf("[SEEDER] Failed to get existing complaint count: %v", err)
		// Continue anyway, assuming no complaints exist
		existingCount = 0
	}

	// Set a reasonable maximum number of complaints per tenant
	const MAX_COMPLAINTS_PER_TENANT int64 = 3

	// If tenant already has maximum complaints, skip
	if existingCount >= MAX_COMPLAINTS_PER_TENANT {
		log.Printf("[SEEDER] Tenant ID %d already has %d complaints (max: %d), skipping",
			user.ID, existingCount, MAX_COMPLAINTS_PER_TENANT)
		return nil
	}

	// Create random number of complaints (1-2) but don't exceed maximum
	complaintCount := int64(r.Intn(2) + 1)
	if existingCount+complaintCount > MAX_COMPLAINTS_PER_TENANT {
		complaintCount = MAX_COMPLAINTS_PER_TENANT - existingCount
	}

	log.Printf("[SEEDER] Creating %d complaints for tenant ID %d (currently has %d)",
		complaintCount, user.ID, existingCount)

	for i := int64(0); i < complaintCount; i++ {
		complaint, err := queries.CreateComplaint(ctx, db.CreateComplaintParams{
			CreatedBy:   user.ID,
			Category:    RandomComplaintCategory(),
			Title:       faker.Sentence(),
			Description: faker.Paragraph(),
		})
		if err != nil {
			return fmt.Errorf("[SEEDER] error creating complaint: %v", err.Error())
		}
		log.Printf("[SEEDER] Complaint created for tenant ID %d: %d", user.ID, complaint.ID)
	}

	log.Printf("[SEEDER] Complaints seeded successfully for tenant ID %d (%d total)",
		user.ID, existingCount+complaintCount)
	return nil
}

func createLockers(queries *db.Queries, tenants []db.ListUsersByRoleRow, ctx context.Context) error {
	log.Printf("[SEEDER] Checking lockers for %d tenants", len(tenants))

	var totalCreated int

	for _, tenant := range tenants {
		// Use the CountLockersByUser function with proper pgtype.Int8 conversion
		userIDParam := pgtype.Int8{Int64: tenant.ID, Valid: true}
		lockerCount, err := queries.CountLockersByUser(ctx, userIDParam)
		if err != nil {
			log.Printf("[SEEDER] Warning: Failed to get locker count for tenant %d: %v", tenant.ID, err)
			// Continue anyway, assuming no lockers exist
			lockerCount = 0
		}

		// Maximum 2 lockers per tenant
		const MAX_LOCKERS_PER_TENANT = 2

		// Skip if tenant already has maximum number of lockers
		if lockerCount >= MAX_LOCKERS_PER_TENANT {
			log.Printf("[SEEDER] Tenant %d already has %d lockers, skipping", tenant.ID, lockerCount)
			continue
		}

		// Create remaining lockers up to the maximum
		toCreate := int(MAX_LOCKERS_PER_TENANT - lockerCount)
		for i := 0; i < toCreate; i++ {
			// Generate a random 4-digit access code
			accessCode := fmt.Sprintf("%04d", 1000+r.Intn(9000))

			if err := queries.CreateLocker(ctx, db.CreateLockerParams{
				UserID:     pgtype.Int8{Int64: tenant.ID, Valid: true},
				AccessCode: pgtype.Text{String: accessCode, Valid: true},
			}); err != nil {
				log.Printf("[SEEDER] Error creating locker for tenant %d: %v", tenant.ID, err)
				continue
			}

			log.Printf("[SEEDER] Created locker with access code %s for tenant %d", accessCode, tenant.ID)
			totalCreated++
		}
	}

	log.Printf("[SEEDER] Created %d new lockers for tenants", totalCreated)
	return nil
}

func SeedDB(queries *db.Queries, pool *pgxpool.Pool, adminID int32) error {
	ctx := context.Background()

	// Count tenant users
	users, err := queries.ListUsersByRole(ctx, db.RoleTenant)
	if err != nil {
		return errors.New("[SEEDER] error counting users: " + err.Error())
	}

	tenantCount := len(users)
	if tenantCount == 0 {
		log.Println("[SEEDER] No tenant users found, skipping data seeding")
		return nil
	}

	log.Printf("[SEEDER] Found %d tenant users for seeding", tenantCount)

	// Create lockers for all tenants
	if err = createLockers(queries, users, ctx); err != nil {
		return errors.New("[SEEDER] error creating lockers: " + err.Error())
	}

	// Determine how many tenants to seed data for in this run
	// Use 40-60% of available tenants, but at least 3 and at most 8
	seedCount := int(float64(tenantCount) * (0.4 + r.Float64()*0.2))
	if seedCount < 3 {
		seedCount = min(3, tenantCount) // At least 3, but not more than available
	}
	if seedCount > 8 {
		seedCount = 8 // Cap at 8 tenants per run to avoid overwhelming the system
	}

	log.Printf("[SEEDER] Will seed work orders and complaints for %d/%d tenants", seedCount, tenantCount)

	// Get random tenants from the database
	row, err := pool.Query(ctx, "SELECT id, clerk_id, first_name, last_name, email, phone, role, created_at FROM users WHERE role = 'tenant' ORDER BY RANDOM() LIMIT $1", seedCount)
	if err != nil {
		return errors.New("[SEEDER] error getting random tenants: " + err.Error())
	}
	defer row.Close()

	// Process each selected tenant
	var processedCount int
	var u db.User
	for row.Next() {
		if err := row.Scan(
			&u.ID,
			&u.ClerkID,
			&u.FirstName,
			&u.LastName,
			&u.Email,
			&u.Phone,
			&u.Role,
			&u.CreatedAt,
		); err != nil {
			log.Printf("[SEEDER] Warning: Error scanning tenant: %v", err)
			continue
		}

		log.Printf("[SEEDER] Processing tenant: %s %s (%s, ID: %d)",
			u.FirstName, u.LastName, u.Email, u.ID)

		// Create work orders for this tenant
		err := createWorkOrders(queries, u, ctx)
		if err != nil {
			log.Printf("[SEEDER] Error creating work orders for tenant %d: %v", u.ID, err)
			// Continue with other tenants instead of aborting
			continue
		}

		// Create complaints for this tenant (only 50% chance)
		if r.Intn(2) == 0 {
			err = createComplaints(queries, u, ctx)
			if err != nil {
				log.Printf("[SEEDER] Error creating complaints for tenant %d: %v", u.ID, err)
				// Continue with other tenants instead of aborting
				continue
			}
		} else {
			log.Printf("[SEEDER] Skipping complaints for tenant %d (random selection)", u.ID)
		}

		processedCount++
	}

	log.Printf("[SEEDER] Successfully processed %d/%d selected tenants", processedCount, seedCount)
	return nil
}

// Helper function for min of integers (not available in older Go versions)
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
