package utils

import (
	"context"
	_ "database/sql"
	"errors"
	"fmt"
	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/go-faker/faker/v4"
	_ "github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"log"
	"math/rand"
)

func RandomWorkCategory() db.WorkCategory {
	categories := []db.WorkCategory{
		db.WorkCategoryPlumbing,
		db.WorkCategoryElectric,
		db.WorkCategoryCarpentry,
		db.WorkCategoryHvac,
		db.WorkCategoryOther,
	}

	return categories[rand.Intn(len(categories))]
}

func RandomComplaintCategory() db.ComplaintCategory {
	categories := []db.ComplaintCategory{
		db.ComplaintCategoryNoise,
		db.ComplaintCategoryMaintenance,
		db.ComplaintCategoryOther,
	}

	return categories[rand.Intn(len(categories))]
}

func RandomStatus() db.Status {
	statuses := []db.Status{
		db.StatusClosed,
		db.StatusInProgress,
		db.StatusOpen,
		db.StatusResolved,
	}

	return statuses[rand.Intn(len(statuses))]
}

func createWorkOrders(queries *db.Queries, user db.User, ctx context.Context) error {

	for i := 0; i < 12; i++ {
		order, err := queries.CreateWorkOrder(context.Background(), db.CreateWorkOrderParams{
			CreatedBy:   user.ID,
			Category:    RandomWorkCategory(),
			Title:       faker.Sentence(),
			Description: faker.Paragraph(),
		})
		if err != nil {
			return errors.New(fmt.Sprintf("[SEEDER] error creating work order: %v", err.Error()))
		}
		log.Println("[SEEDER] work order created", order.ID)
	}

	log.Println("[SEEDER] work orders seeded successfully")
	return nil
}

func createComplaints(queries *db.Queries, user db.User, ctx context.Context) error {
	for i := 0; i < 7; i++ {
		complaint, err := queries.CreateComplaint(ctx, db.CreateComplaintParams{
			CreatedBy:   user.ID,
			Category:    RandomComplaintCategory(),
			Title:       faker.Sentence(),
			Description: faker.Paragraph(),
		})
		if err != nil {
			return errors.New(fmt.Sprintf("[SEEDER] error creating complaint: %v", err.Error()))
		}
		log.Println("[SEEDER] complaint created successfully", complaint.ID)
	}

	log.Println("[SEEDER] complaints seeded successfully")
	return nil
}

func SeedDB(queries *db.Queries, pool *pgxpool.Pool, adminID int32) error {
	ctx := context.Background()

	// count users
	users, err := queries.ListUsersByRole(ctx, db.RoleTenant)
	if err != nil {
		return errors.New("[SEEDER] error counting users: " + err.Error())
	}
	if len(users) > 0 {
		log.Println("[SEEDER] tenant users found")
	}

	// err = createLockers(queries, users, ctx)

	// get random users from the database
	row, err := pool.Query(ctx, "SELECT id, clerk_id, first_name, last_name, email, phone,role, created_at FROM users ORDER BY RANDOM() LIMIT 3")
	if err != nil {
		return errors.New("[SEEDER] error getting seed user: " + err.Error())
	}
	defer row.Close()

	log.Println(row.RawValues())

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
			return errors.New("[SEEDER] error seeding user: " + err.Error())
		}

		err := createWorkOrders(queries, u, ctx)
		if err != nil {
			return errors.New("[SEEDER] error creating work orders: " + err.Error())
		}

		err = createComplaints(queries, u, ctx)
		if err != nil {
			return errors.New("[SEEDER] error creating complaints: " + err.Error())
		}

	}

	return nil
}
