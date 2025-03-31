package main

import (
	"context"
	"log"
	"os"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"

	"github.com/careecodes/RentDaddy/internal/utils"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	clerkSecretKey := os.Getenv("CLERK_SECRET_KEY")
	if clerkSecretKey == "" {
		log.Fatal("[SEED_USERS] CLERK_SECRET_KEY env required")
		return
	}

	clerk.SetKey(clerkSecretKey)
	ctx := context.Background()
	// CLerk 10 request per second
	rateLimitThreshold := 10
	userCount := 3

	// check if users already seeded
	pool, err := pgxpool.New(ctx, os.Getenv("PG_URL"))
	if err != nil {
		log.Printf("[SEED_USERS] Error initializing pg: %v", err)
		return
	}
	defer pool.Close()
	queries := db.New(pool)

	row := pool.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE role = $1", db.RoleTenant)
	var count int
	if err := row.Scan(&count); err != nil {
		log.Printf("[SEED_USERS] Error counting users: %v", err)
		return
	}
	if count > 90 {
		log.Printf("[SEED_USERS] Users already seeded: %d", count)
		return
	}
	log.Printf("[SEED_USERS] Starting %d users", userCount)

	aUsers, err := queries.ListUsersByRole(ctx, db.RoleAdmin)
	if err != nil {
		log.Printf("[SEED_USERS] Error listing admin users: %v", err)
		return
	}

	var adminUser *clerk.User
	var aID int
	if len(aUsers) == 0 {
		log.Println("[SEED_USERS] No admin found, seeding admin")
		adminUser, err = createAdmin(ctx)
		if err != nil {
			log.Printf("[SEED_USERS] Error seeding admin: %v", err)
			return
		}
		a, err := queries.GetUser(ctx, adminUser.ID)
		if err != nil {
			log.Printf("[SEED_USERS] Error getting seeded admin: %v", err)
			return
		}
		log.Printf("[SEED_USERS] Seeded admin: %v", a)
		aID = int(a.ID)
	}

	for i := 0; i < userCount; i++ {
		if err := createTenant(ctx); err != nil {
			log.Printf("[SEED_USERS] Error seeding user %d: %v", i+1, err)
		}

		if userCount+1 > rateLimitThreshold {
			time.Sleep(2 * time.Second)
		}
	}

	log.Println("[SEED_USERS] Waiting for clerk to sync")
	time.Sleep(6 * time.Second)

	err = utils.SeedDB(queries, pool, int32(aID))
	if err != nil {
		log.Printf("[SEED_USERS] Error seeding db: %v", err)
		return
	}
	log.Println("[SEED_USERS] Finished seeding db")
}
