package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/go-faker/faker/v4"
)

type Role string

const (
	RoleTenant Role = "tenant"
	RoleAdmin  Role = "admin"
)

type Apartment struct {
	UnitNumber int `json:"unit_number"`
	Price      int `json:"price"`
	SizeSqFt   int `json:"sqft"`
	// Admin(clerk_id) inviting tenant
	ManagementId string `json:"management_id"`
	LeaseId      int    `json:"lease_id"`
}

type ClerkUserPublicMetaData struct {
	DbId      int32     `json:"db_id"`
	Role      Role      `json:"role"`
	Apartment Apartment `json:"apartment"`
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

	log.Printf("[SEED_USERS] Starting %d users", userCount)

	managementId, err := createAdmin(ctx)
	if err != nil {
		log.Printf("[SEED_USERS] Error seeding admin: %v", err)
		return
	}

	for i := 0; i < userCount; i++ {
		if managementId == nil {
			log.Println("ManagementId is nill")
			return
		}
		if err := createTenant(ctx, unitNumber, managementId); err != nil {
			log.Printf("[SEED_USERS] Error seeding user %d: %v", i+1, err)
		}
		unitNumber = unitNumber + 1

		if userCount+1 > rateLimitThreshold {
			time.Sleep(2 * time.Second)
		}
	}
}

func createAdmin(ctx context.Context) (*string, error) {
	userMetadata := ClerkUserPublicMetaData{
		DbId: 0,
		Role: RoleAdmin,
		Apartment: Apartment{
			UnitNumber:   0,
			Price:        0,
			SizeSqFt:     0,
			ManagementId: "",
			LeaseId:      0,
		},
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

	AdminData, err := user.Create(ctx, &user.CreateParams{
		EmailAddresses: &userEntry.EmailAddresses,
		FirstName:      &userEntry.FirstName,
		LastName:       &userEntry.LastName,
		PublicMetadata: &userEntry.PublicMetaData,
	})
	if err != nil {
		return nil, err
	}
	return &AdminData.ID, nil
}

func createTenant(ctx context.Context, unitNumber int, managementId *string) error {
	var apartmentEntry Apartment
	apartmentEntry.ManagementId = *managementId
	apartmentEntry.LeaseId = 1

	randomUnitNumbers, err := faker.RandomInt(unitNumber, 999)
	if err != nil {
		return err
	}

	if len(randomUnitNumbers) == 0 {
		apartmentEntry.UnitNumber = randomUnitNumbers[0]
	} else {
		apartmentEntry.UnitNumber = unitNumber
	}

	sqft, err := faker.RandomInt(500, 3000)
	if err != nil {
		return err
	}
	if len(sqft) > 0 {
		apartmentEntry.SizeSqFt = sqft[0]
	}

	price := (sqft[0]) * 2
	apartmentEntry.Price = price

	userMetadata := ClerkUserPublicMetaData{
		DbId: 0,
		Role: RoleTenant,
		Apartment: Apartment{
			UnitNumber:   apartmentEntry.UnitNumber,
			Price:        apartmentEntry.Price,
			SizeSqFt:     apartmentEntry.SizeSqFt,
			ManagementId: apartmentEntry.ManagementId,
			LeaseId:      apartmentEntry.LeaseId,
		},
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
