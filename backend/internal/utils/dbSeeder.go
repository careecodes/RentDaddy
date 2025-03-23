package utils

import (
	"context"
	_ "database/sql"
	"errors"
	"fmt"
	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/go-faker/faker/v4"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"log"
	"math/big"
	"math/rand"
	"time"
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

	log.Printf("Work orders seeded successfully: %d work orders created", 10)

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

	log.Printf("Complaints seeded successfully: %d complaints created", 10)
	return nil
}

func createParkingPermits(queries *db.Queries, user db.User, ctx context.Context) error {
	for i := 0; i < 10; i++ {
		_, err := queries.CreateParkingPermit(ctx, db.CreateParkingPermitParams{
			CreatedBy:    user.ID,
			PermitNumber: user.ID + int64(i),
			ExpiresAt:    pgtype.Timestamp{Time: time.Now().AddDate(0, 0, 2), Valid: true},
		})
		if err != nil {
			return errors.New(fmt.Sprintf("[SEEDER] error creating parking permit: %d %v", user.ID, err.Error()))
		}
	}

	log.Printf("Parking permits seeded successfully: %d parking permits created", 10)
	return nil
}

func convertToPgTypeNumeric(value int) pgtype.Numeric {
	var numeric pgtype.Numeric
	numeric.Int = big.NewInt(int64(value))
	numeric.Valid = true
	return numeric
}

func createApartments(queries *db.Queries, userID int64, ctx context.Context) error {
	for i := 0; i < 3; i++ {
		sqft, err := faker.RandomInt(500, 2000)
		if err != nil {
			return errors.New("[SEEDER] error creating apartment: " + err.Error())
		}

		_, err = queries.CreateApartment(ctx, db.CreateApartmentParams{
			UnitNumber:   pgtype.Int2{Int16: int16(i + 1), Valid: true},
			Price:        convertToPgTypeNumeric(2 * sqft[0]),
			Size:         pgtype.Int2{Int16: int16(sqft[0]), Valid: true},
			ManagementID: pgtype.Int8{Int64: userID, Valid: true},
		})
		if err != nil {
			return errors.New(fmt.Sprintf("[SEEDER] error creating apartment: %d %v", userID, err.Error()))
		}
	}

	log.Printf("Apartments seeded successfully: %d apartments created", 10)
	return nil
}

func SeedDB(queries *db.Queries, pool *pgxpool.Pool) error {
	ctx := context.Background()

	log.Println("[SEEDER] seeding work orders")

	admins, err := queries.ListUsersByRole(ctx, db.RoleAdmin)
	if err != nil {
		return errors.New("[SEEDER] error counting users: " + err.Error())
	}
	if len(admins) == 0 {
		return errors.New("[SEEDER] no admins found")
	}

	err = createApartments(queries, admins[0].ID, ctx)

	//count users
	users, err := queries.ListUsersByRole(ctx, db.RoleTenant)
	if err != nil {
		return errors.New("[SEEDER] error counting users: " + err.Error())
	}
	if len(users) > 0 {
		log.Println("[SEEDER] tenant users found")
		return nil
	}

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

		fmt.Printf("has user: %v\n", u != db.User{})

		err := createWorkOrders(queries, u, ctx)
		if err != nil {
			return errors.New("[SEEDER] error creating work orders: " + err.Error())
		}

		err = createComplaints(queries, u, ctx)
		if err != nil {
			return errors.New("[SEEDER] error creating complaints: " + err.Error())
		}

		err = createParkingPermits(queries, u, ctx)
		if err != nil {
			return errors.New("[SEEDER] error creating parking permits: " + err.Error())
		}
	}

	return nil
}
