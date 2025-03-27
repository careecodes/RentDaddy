package utils

import (
	"context"
	_ "database/sql"
	"errors"
	"fmt"
	"log"
	"math/big"
	"math/rand"
	"strconv"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/go-faker/faker/v4"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
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
		_, err := queries.CreateWorkOrder(context.Background(), db.CreateWorkOrderParams{
			CreatedBy:   user.ID,
			Category:    RandomWorkCategory(),
			Title:       faker.Sentence(),
			Description: faker.Paragraph(),
		})
		if err != nil {
			return errors.New(fmt.Sprintf("[SEEDER] error creating work order: %d %v", i, err.Error()))
		}
	}

	log.Println("[SEEDER] work orders seeded successfully")

	return nil
}

func createComplaints(queries *db.Queries, user db.User, ctx context.Context) error {
	for i := 0; i < 10; i++ {
		_, err := queries.CreateComplaint(ctx, db.CreateComplaintParams{
			CreatedBy:   user.ID,
			Category:    RandomComplaintCategory(),
			Title:       faker.Sentence(),
			Description: faker.Paragraph(),
		})
		if err != nil {
			return errors.New(fmt.Sprintf("[SEEDER] error creating complaint: %d %v", i, err.Error()))
		}
	}

	log.Println("[SEEDER] complaints seeded successfully")
	return nil
}

func createParkingPermits(queries *db.Queries, user db.User, createCount int, ctx context.Context) error {
	for i := 0; i < createCount; i++ {
		_, err := queries.CreateParkingPermit(ctx, db.CreateParkingPermitParams{
			CreatedBy: user.ID,
			ExpiresAt: pgtype.Timestamp{Time: time.Now().AddDate(0, 0, 2), Valid: true},
		})
		if err != nil {
			return errors.New(fmt.Sprintf("[SEEDER] error creating parking permit: %d %v", user.ID, err.Error()))
		}
	}

	log.Println("[SEEDER] parking permits seeded successfully")
	return nil
}

func convertToPgTypeNumeric(value int) pgtype.Numeric {
	var numeric pgtype.Numeric
	numeric.Int = big.NewInt(int64(value))
	numeric.Valid = true
	return numeric
}

func createApartments(queries *db.Queries, adminID int64, ctx context.Context) error {
	log.Println("adminID: ", adminID)
	for i := 0; i < 4; i++ {
		for j := range 54 {
			sqft, err := faker.RandomInt(500, 2000)
			if err != nil {
				return errors.New("[SEEDER] error creating apartment: " + err.Error())
			}

			unitNum, err := strconv.Atoi(fmt.Sprintf("%d%d", i+1, j+1))
			if err != nil {
				return errors.New("[SEEDER] error creating apartment: " + err.Error())
			}

			_, err = queries.CreateApartment(ctx, db.CreateApartmentParams{
				UnitNumber:   pgtype.Int2{Int16: int16(unitNum), Valid: true},
				Price:        convertToPgTypeNumeric(2 * sqft[0]),
				Size:         pgtype.Int2{Int16: int16(sqft[0]), Valid: true},
				ManagementID: adminID,
			})
			if err != nil {
				return errors.New(fmt.Sprintf("[SEEDER] error creating apartment: %d %v", adminID, err.Error()))
			}
		}
	}

	log.Printf("[SEEDER] apartments seeded successfully: %d apartments created", 4*54)
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
			ManagementID: apartment.ManagementID, Availability: false,
		})
		if err != nil {
			return errors.New("[SEEDER] error updating apartment availability: " + err.Error())
		}
	}

	return nil
}

func createLockers(queries *db.Queries, tenants []db.User, ctx context.Context) error {
	//for tenant := range tenants {
	//	// create 2 lockers for each tenant
	//	for i := 0; i < 2; i++ {
	//		_, err := queries.CreateLocker(ctx, db.CreateLockerParams{
	//			CreatedBy: tenants[tenant].ID,
	//			Code:      tenants[tenant].ID + int64(i),
	//		})
	//		if err != nil {
	//			return errors.New(fmt.Sprintf("[SEEDER] error creating locker: %d %v", tenants[tenant].ID, err.Error()))
	//		}
	//	}
	//}

	return nil
}

func SeedDB(queries *db.Queries, pool *pgxpool.Pool, adminID int32) error {
	ctx := context.Background()

	log.Println("[SEEDER] seeding work orders")

	apartments, err := pool.Query(ctx, "SELECT COUNT(*) FROM apartments")
	if err != nil {
		return errors.New("[SEEDER] error counting apartments: " + err.Error())
	}
	defer apartments.Close()
	if apartments.Next() {
		var aCount int
		if err := apartments.Scan(&aCount); err != nil {
			return errors.New("[SEEDER] error scanning apartments: " + err.Error())
		}
		if aCount < 100 {
			err := createApartments(queries, int64(adminID), ctx)
			if err != nil {
				return errors.New("[SEEDER] error creating apartments: " + err.Error())
			}
		} else {
			log.Println("[SEEDER] no apartments created")
		}
	}

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

		pCount, err := queries.GetTenantParkingPermits(ctx, u.ID)
		if err != nil {
			log.Println("[SEEDER] error counting parking permits: " + err.Error())
		}
		if len(pCount) < 2 {
			// create up to 2 parking permits for the tenant
			err = createParkingPermits(queries, u, 2-len(pCount), ctx)
			if err != nil {
				return errors.New("[SEEDER] error creating parking permits: " + err.Error())
			}
		}
	}

	return nil
}
