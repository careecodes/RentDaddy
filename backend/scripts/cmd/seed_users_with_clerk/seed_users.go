// Package main provides utility functions for seeding users and data
// This file contains helper functions for creating users through Clerk API
package main

import (
	"context"
	"encoding/json"
	"os"
	"log"

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

	// Try to use environment variables for admin email and name
	adminEmail := os.Getenv("ADMIN_EMAIL")
	adminFirstName := os.Getenv("ADMIN_FIRST_NAME")
	adminLastName := os.Getenv("ADMIN_LAST_NAME")
	
	// Log the admin email we're using
	if adminEmail != "" {
		log.Printf("[CREATE_ADMIN] Using ADMIN_EMAIL from environment: %s", adminEmail)
	} else {
		// Fall back to SMTP_FROM if ADMIN_EMAIL is not set
		adminEmail = os.Getenv("SMTP_FROM")
		if adminEmail != "" {
			log.Printf("[CREATE_ADMIN] ADMIN_EMAIL not set, using SMTP_FROM: %s", adminEmail)
		} else {
			// Last resort: use a random email
			adminEmail = faker.Email()
			log.Printf("[CREATE_ADMIN] No admin email in environment, using random email: %s", adminEmail)
		}
	}
	
	// Use environment variables for name if available, otherwise use random values
	if adminFirstName == "" {
		adminFirstName = faker.FirstName()
		log.Printf("[CREATE_ADMIN] Using random first name: %s", adminFirstName)
	} else {
		log.Printf("[CREATE_ADMIN] Using ADMIN_FIRST_NAME from environment: %s", adminFirstName)
	}
	
	if adminLastName == "" {
		adminLastName = faker.LastName()
		log.Printf("[CREATE_ADMIN] Using random last name: %s", adminLastName)
	} else {
		log.Printf("[CREATE_ADMIN] Using ADMIN_LAST_NAME from environment: %s", adminLastName)
	}

	userEntry := ClerkUserEntry{
		EmailAddresses: []string{adminEmail},
		FirstName:      adminFirstName,
		LastName:       adminLastName,
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
	
	log.Printf("[CREATE_ADMIN] Successfully created admin user: %s %s (%s)", 
		adminFirstName, adminLastName, adminEmail)
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
