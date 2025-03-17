package utils

import (
	"context"
	"github.com/bxcodec/faker/v4"
	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/jackc/pgx/v5/pgtype"
	"log"
	"time"
)

func SeedDB(queries *db.Queries) {

	// Create a new test user
	user := db.CreateUserParams{
		ClerkID:   "clerk_user_id",
		FirstName: faker.FirstName(),
		LastName:  faker.LastName(),
		Email:     faker.Email(),
		Phone:     pgtype.Text{String: faker.Phonenumber(), Valid: true},
		Role:      db.RoleTenant,
		LastLogin: pgtype.Timestamp{Time: time.Now(), Valid: true},
	}

	createdUser, err := queries.CreateUser(context.Background(), user)
	if err != nil {
		log.Printf("Error seeding user: %v", err)
		log.Fatal("Failed to seed the database with initial user data")
		return
	} else {
		log.Printf("User seeded successfully: %v", user.Email)
	}

	for i := 0; i < 10; i++ {
		workOrder := db.CreateWorkOrderParams{
			CreatedBy:   createdUser.ID,
			OrderNumber: int64(i + 1),
			Category:    db.WorkCategory(faker.Word()),
			Title:       faker.Sentence(),
			Description: faker.Paragraph(),
			UnitNumber:  int16(100 + i),
			Status:      db.StatusOpen,
		}

		_, err := queries.CreateWorkOrder(context.Background(), workOrder)
		if err != nil {
			log.Printf("Error seeding work order: %v", err)
			log.Fatal("Failed to seed the database with initial work order data")
		}
	}

	log.Printf("Work orders seeded successfully: %d work orders created", 10)
}
