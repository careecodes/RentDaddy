package main

import (
	"context"
	"encoding/json"
	"log"
	"os"

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
	DbId       int32 `json:"db_id"`
	Role       Role  `json:"role"`
	UnitNumber int   `json:"unit_number"`
	// Admin(clerk_id) inviting tenant
	ManagementId string `json:"management_id"`
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
	userCount := 10
	unitNumber := 101

	for i := 0; i < userCount; i++ {
		if err := createUser(ctx, unitNumber); err != nil {
			log.Printf("[SEED_USERS] Error seeding user %d: %v", i+1, err)
			unitNumber = unitNumber + 1
		}
	}
}

func createUser(ctx context.Context, unitNumber int) error {
	// NOTE: watch for dublication / recheck randomUnitNumber logic
	randomUnitNumbers, err := faker.RandomInt(unitNumber, 999)
	if err != nil {
		return err
	}

	if len(randomUnitNumbers) > 0 {
		unitNumber = randomUnitNumbers[0]
	}

	userMetadata := ClerkUserPublicMetaData{
		DbId:         0,
		Role:         RoleTenant,
		UnitNumber:   unitNumber,
		ManagementId: "",
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

	// Make new entries for work_orders and complaints and maybe parking

	return nil
}
