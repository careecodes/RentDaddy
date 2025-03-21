package utils

import (
	"context"
	"errors"
	"fmt"
	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/go-faker/faker/v4"
	"github.com/jackc/pgx/v5/pgxpool"
	"log"
	"math/rand"
)

func RandomCategory() db.WorkCategory {
	categories := []db.WorkCategory{
		db.WorkCategoryPlumbing,
		db.WorkCategoryElectric,
		db.WorkCategoryCarpentry,
		db.WorkCategoryHvac,
		db.WorkCategoryOther,
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

	orders, err := queries.CountWorkOrdersByUser(ctx, user.ID)
	if err != nil {
		return errors.New("[SEEDER] error getting work orders: " + err.Error())
	}
	if orders > 0 {
		log.Println("[SEEDER] work orders already exist")
		return nil
	}

	for i := 0; i < 10; i++ {
		orderNum := user.ID + int64(rand.Intn(1000))
		_, err := queries.CreateWorkOrder(context.Background(), db.CreateWorkOrderParams{
			CreatedBy:   user.ID,
			OrderNumber: orderNum,
			Category:    RandomCategory(),
			Title:       faker.Sentence(),
			Description: faker.Paragraph(),
			UnitNumber:  user.UnitNumber.Int16,
			Status:      RandomStatus(),
		})
		if err != nil {
			return errors.New(fmt.Sprintf("[SEEDER] error creating work order: %d %v", orderNum, err.Error()))
		}
	}

	log.Printf("Work orders seeded successfully: %d work orders created", 10)

	return nil
}

func SeedDB(queries *db.Queries, pool *pgxpool.Pool) error {
	ctx := context.Background()

	// get a user from the database
	row, err := pool.Query(ctx, "SELECT id, clerk_id, first_name, last_name, email, phone,role, unit_number, created_at FROM users ORDER BY RANDOM() LIMIT 3")
	if err != nil {
		return errors.New("[SEEDER] error getting seed user: " + err.Error())
	}

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
			&u.UnitNumber,
			&u.CreatedAt,
		); err != nil {
			return errors.New("[SEEDER] error seeding user: " + err.Error())
		}

		fmt.Printf("has user: %v\n", u != db.User{})

		err := createWorkOrders(queries, u, ctx)
		if err != nil {
			return errors.New("[SEEDER] error creating work orders: " + err.Error())
		}
	}

	return nil
}
