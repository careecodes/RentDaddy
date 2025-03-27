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
			Category:    RandomWorkCategory(),
			Title:       faker.Sentence(),
			Description: faker.Paragraph(),
			Status:      RandomStatus(),
		})
		if err != nil {
			return errors.New(fmt.Sprintf("[SEEDER] error creating work order: %d %v", orderNum, err.Error()))
		}
	}

	log.Println("[SEEDER] work orders seeded successfully")

	return nil
}

func createComplaints(queries *db.Queries, user db.User, ctx context.Context) error {
	for i := 0; i < 10; i++ {
		complaintNum := user.ID + int64(rand.Intn(1000))
		_, err := queries.CreateComplaint(ctx, db.CreateComplaintParams{
			CreatedBy:       user.ID,
			ComplaintNumber: complaintNum,
			Category:        RandomComplaintCategory(),
			Title:           faker.Sentence(),
			Description:     faker.Paragraph(),
			Status:          RandomStatus(),
		})
		if err != nil {
			return errors.New(fmt.Sprintf("[SEEDER] error creating complaint: %d %v", complaintNum, err.Error()))
		}
	}

	log.Println("[SEEDER] complaints seeded successfully")
	return nil
}

func assignApartment(pool *pgxpool.Pool, queries *db.Queries, user db.User, ctx context.Context) error {
	randomApartment, err := pool.Query(ctx, "SELECT id, unit_number, price, size, management_id, lease_id FROM apartments WHERE availability = true ORDER BY RANDOM() LIMIT 1")
	if err != nil {
		return errors.New("[SEEDER] error getting random apartment: " + err.Error())
	}

	var apartment db.Apartment
	for randomApartment.Next() {
		if err := randomApartment.Scan(
			&apartment.ID,
			&apartment.UnitNumber,
			&apartment.Price,
			&apartment.Size,
			&apartment.ManagementID,
		); err != nil {
			return errors.New("[SEEDER] error scanning apartment: " + err.Error())
		}

		err := queries.UpdateApartment(ctx, db.UpdateApartmentParams{
			ID:           apartment.ID,
			Price:        apartment.Price,
			ManagementID: apartment.ManagementID,
			Availability: false,
		})
		if err != nil {
			return errors.New("[SEEDER] error updating apartment availability: " + err.Error())
		}
	}

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

		wOCount, err := queries.ListWorkOrdersByUser(ctx, u.ID)
		if err != nil {
			log.Println("[SEEDER] error counting work orders: " + err.Error())
		}
		if len(wOCount) < 10 {
			err := createWorkOrders(queries, u, ctx)
			if err != nil {
				return errors.New("[SEEDER] error creating work orders: " + err.Error())
			}
		}

		cCount, err := queries.ListWorkOrdersByUser(ctx, u.ID)
		if err != nil {
			log.Println("[SEEDER] error counting complaints: " + err.Error())
		}
		if len(cCount) < 10 {
			err = createComplaints(queries, u, ctx)
			if err != nil {
				return errors.New("[SEEDER] error creating complaints: " + err.Error())
			}
		}

	}

	return nil
}
