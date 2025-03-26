package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/internal/utils"
	"github.com/careecodes/RentDaddy/middleware"
	"github.com/go-faker/faker/v4"
	"github.com/jackc/pgx/v5/pgtype"
	"log"
	"net/http"
	"strconv"
)

type Building struct {
	BuildingNumber string `json:"buildingNumber"`
	FloorNumbers   int    `json:"floorNumbers"`
	NumberOfRooms  int    `json:"numberOfRooms"`
}

type BuildingRequest struct {
	Buildings      []Building `json:"buildings"`
	ParkingTotal   int        `json:"parking_total"`
	PerUserParking int        `json:"per_user_parking"`
	LockerCount    int        `json:"locker_count"`
	ManagementID   int        `json:"management_id"`
	ManagePhone    string     `json:"manager_phone"`
	ManageEmail    string     `json:"manager_email"`
}

func ConstructApartments(queries *db.Queries, w http.ResponseWriter, r *http.Request) error {
	adminCtxt := middleware.GetUserCtx(r)
	if adminCtxt == nil {
		return errors.New("[Construct] no admin context found")
	}

	var params BuildingRequest
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return errors.New("[Construct] error decoding request body")
	}

	adminClerkID := adminCtxt.ID
	adminUser, err := queries.GetUser(r.Context(), adminClerkID)
	if err != nil {
		return errors.New("[Construct] cannot retrieve admin: " + err.Error())
	}
	if adminUser.ClerkID != adminClerkID {
		return errors.New("[Construct] clerk id mismatch")
	}
	if adminUser.Role != db.RoleAdmin {
		return errors.New("[Construct] unauthorized user")
	}

	for _, building := range params.Buildings {
		buildingNumber, err := strconv.Atoi(building.BuildingNumber)
		if err != nil {
			return errors.New("[Construct] invalid building number: " + building.BuildingNumber)
		}
		buildingParams := db.CreateBuildingParams{
			BuildingNumber: int16(buildingNumber),
			ParkingTotal:   pgtype.Int8{Int64: int64(params.ParkingTotal), Valid: true},
			PerUserParking: pgtype.Int8{Int64: int64(params.PerUserParking), Valid: true},
			ManagementID:   adminUser.ID,
			ManagerPhone: pgtype.Text{
				String: params.ManagePhone,
				Valid:  true,
			},
			ManagerEmail: pgtype.Text{
				String: params.ManageEmail,
				Valid:  true,
			},
		}
		_, err = queries.CreateBuilding(r.Context(), buildingParams)
		if err != nil {
			return errors.New("[Construct] error creating building: " + err.Error())
		}

		_, err = queries.CreateManyLockers(r.Context(), int32(params.LockerCount))
		if err != nil {
			return errors.New("[Construct] error creating lockers: " + err.Error())
		}

		for i := 0; i < building.FloorNumbers; i++ {
			for j := 0; j < building.NumberOfRooms; j++ {
				sqft, err := faker.RandomInt(500, 2000)
				if err != nil {
					return errors.New("[Construct] error creating apartment: " + err.Error())
				}

				unitNum, err := strconv.Atoi(fmt.Sprintf("%s%d%02d", building.BuildingNumber, i+1, j+1))
				if err != nil {
					return errors.New("[Construct] error creating apartment: " + err.Error())
				}

				_, err = queries.CreateApartment(r.Context(), db.CreateApartmentParams{
					UnitNumber:   pgtype.Int8{Int64: int64(unitNum), Valid: true},
					Price:        utils.ConvertToPgTypeNumeric(2 * sqft[0]),
					Size:         pgtype.Int2{Int16: int16(sqft[0]), Valid: true},
					ManagementID: adminUser.ID,
					BuildingID:   int64(buildingNumber),
				})
				if err != nil {
					return errors.New(fmt.Sprintf("[Construct] error creating apartment: %d %v", adminUser.ID, err.Error()))
				}
			}
		}
	}

	log.Printf("[SEEDER] apartments seeded successfully: %d apartments created", 4*54)
	return nil
}
