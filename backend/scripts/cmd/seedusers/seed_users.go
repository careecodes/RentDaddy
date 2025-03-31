package main

import (
	"context"
	"encoding/json"

	"github.com/bxcodec/faker/v4"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
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
