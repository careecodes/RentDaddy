package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"


	"github.com/careecodes/RentDaddy/internal/utils"

	//"github.com/careecodes/RentDaddy/internal/utils"


	"github.com/jackc/pgx/v5/pgxpool"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/go-faker/faker/v4"
)

type Role string

const (
	RoleTenant Role = "tenant"
	RoleAdmin  Role = "admin"
)

type ClerkUserPublicMetaData struct {
	DbId int32 `json:"db_id"`
	Role Role  `json:"role"`
}

type ClerkUserEntry struct {
	EmailAddresses []string        `json:"email_addresses"`
	FirstName      string          `json:"first_name"`
	LastName       string          `json:"last_name"`
	PublicMetaData json.RawMessage `json:"public_metadata"`
}

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

	row := pool.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE role = $1", db.RoleTenant)
	var count int
	var adminUser *clerk.User
	if err := row.Scan(&count); err != nil {
		log.Printf("[SEED_USERS] Error counting users: %v", err)
		return
	}
	if count > 90 {
		log.Printf("[SEED_USERS] Users already seeded: %d", count)
		return
	}
	log.Printf("[SEED_USERS] Starting %d users", userCount)

	adminUser, err = createAdmin(ctx)
	if err != nil {
		log.Printf("[SEED_USERS] Error seeding admin: %v", err)
		return

	}

	for i := 0; i < userCount; i++ {
		if err := createTenant(ctx); err != nil {
			log.Printf("[SEED_USERS] Error seeding user %d: %v", i+1, err)
		}

		if userCount+1 > rateLimitThreshold {
			time.Sleep(2 * time.Second)
		}
	}

	log.Printf("[SEED_USERS] Finished seeding %d users", userCount)
	log.Printf("[SEED_USERS] The admin user is %s", adminUser.ID)

	log.Println("[SEED_USERS] Waiting for clerk to sync")
	time.Sleep(6 * time.Second)

	qString := fmt.Sprintf(`SELECT id FROM users WHERE clerk_id = '%s' AND role = 'admin'`, adminUser.ID)

	aUser := pool.QueryRow(ctx, qString)
	var aID int
	if err := aUser.Scan(&aID); err != nil {
		log.Printf("[SEED_USERS] Error getting adminUser: %v", err)
		return
	}

	queries := db.New(pool)

	err = utils.SeedDB(queries, pool, int32(aID))
	if err != nil {
		log.Printf("[SEED_USERS] Error seeding db: %v", err)
		return
	}
	log.Println("[SEED_USERS] Finished seeding db")
}

func createAdmin(ctx context.Context) (*clerk.User, error) {
	userMetadata := ClerkUserPublicMetaData{
		DbId: 0,
		Role: RoleAdmin,
	}
	metadataBytes, err := json.Marshal(userMetadata)
	if err != nil {
		return nil, err
	}
	metadataRaw := json.RawMessage(metadataBytes)

	userEntry := ClerkUserEntry{
		EmailAddresses: []string{faker.Email()},
		FirstName:      faker.FirstName(),
		LastName:       faker.LastName(),
		PublicMetaData: metadataRaw,
	}

	adminUser, err := user.Create(ctx, &user.CreateParams{
		EmailAddresses: &userEntry.EmailAddresses,
		FirstName:      &userEntry.FirstName,
		LastName:       &userEntry.LastName,
		PublicMetadata: &userEntry.PublicMetaData,
	})
	if err != nil {
		return nil, err
	}
	return adminUser, nil
}

func createTenant(ctx context.Context) error {
	userMetadata := ClerkUserPublicMetaData{
		DbId: 0,
		Role: RoleTenant,
	}
	metadataBytes, err := json.Marshal(userMetadata)
	if err != nil {
		return err
	}
	metadataRaw := json.RawMessage(metadataBytes)

	userEntry := ClerkUserEntry{
		EmailAddresses: []string{faker.Email()},
		FirstName:      faker.FirstName(),
		LastName:       faker.LastName(),
		PublicMetaData: metadataRaw,
	}

	_, err = user.Create(ctx, &user.CreateParams{
		EmailAddresses: &userEntry.EmailAddresses,
		FirstName:      &userEntry.FirstName,
		LastName:       &userEntry.LastName,
		PublicMetadata: &userEntry.PublicMetaData,
	})
	if err != nil {
		return err
	}

	return nil
}
