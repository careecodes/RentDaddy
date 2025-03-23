package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/jackc/pgx/v5"

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
	unitNumber := 101

	// check if users already seeded
	temp, err := pgx.Connect(ctx, os.Getenv("PG_URL"))
	if err != nil {
		log.Printf("[SEED_USERS] Error initializing pg: %v", err)
		return
	}
	row := temp.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE role = $1", db.RoleTenant)
	var count int
	if err := row.Scan(&count); err != nil {
		log.Printf("[SEED_USERS] Error counting users: %v", err)
		return
	}
	if count > 0 {
		log.Printf("[SEED_USERS] Users already seeded: %d", count)
		return
	}

	log.Printf("[SEED_USERS] Starting %d users", userCount)

	if err := createAdmin(ctx); err != nil {
		log.Printf("[SEED_USERS] Error seeding admin: %v", err)
		return

	}

	for i := 0; i < userCount; i++ {
		if err := createTenant(ctx); err != nil {
			log.Printf("[SEED_USERS] Error seeding user %d: %v", i+1, err)
		}
		unitNumber = unitNumber + 1

		if userCount+1 > rateLimitThreshold {
			time.Sleep(2 * time.Second)
		}
	}
}

func createAdmin(ctx context.Context) error {
	userMetadata := ClerkUserPublicMetaData{
		DbId: 0,
		Role: RoleAdmin,
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
