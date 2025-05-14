package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/internal/utils"
	"github.com/careecodes/RentDaddy/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/go-faker/faker/v4"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Building struct {
	BuildingNumber int `json:"buildingNumber"`
	FloorNumbers   int `json:"floorNumbers"`
	NumberOfRooms  int `json:"numberOfRooms"`
}

type BuildingRequest struct {
	Buildings      []Building `json:"buildings"`
	ParkingTotal   int        `json:"parkingTotal"`
	PerUserParking int        `json:"perUserParking"`
	LockerCount    int        `json:"lockerCount"`
}

func ConstructApartments(queries *db.Queries, w http.ResponseWriter, r *http.Request) error {
	adminCtxt := middleware.GetUserCtx(r)
	if adminCtxt == nil {
		log.Println("[Construct-Admin] no admin context found")
		http.Error(w, "no admin context found", http.StatusUnauthorized)
		return errors.New("no admin context found")
	}

	var params BuildingRequest
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		log.Printf("[Construct-Body] error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return errors.New("invalid request body")
	}

	adminClerkID := adminCtxt.ID
	adminUser, err := queries.GetUser(r.Context(), adminClerkID)
	if err != nil {
		log.Printf("[Construct-Admin] cannot retrieve admin: %v", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return errors.New("[Construct] cannot retrieve admin")
	}
	if adminUser.ClerkID != adminClerkID {
		log.Printf("[Construct] admin user does not belong to clerk")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return errors.New("[Construct] admin user does not belong to clerk")
	}
	if adminUser.Role != db.RoleAdmin {
		log.Printf("[Construct] unauthorized user")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return errors.New("[Construct] unauthorized user")
	}

	_, err = queries.CreateManyLockers(r.Context(), int32(params.LockerCount))
	if err != nil {
		log.Printf("[Construct-CreateManyLockers] error creating lockers: %v", err)
		return errors.New("[Construct] error creating lockers: " + err.Error())
	}
	log.Println("[Construct-CreateManyLockers] created lockers successfully")

	_, err = queries.CreateManyParkingPermits(r.Context(), int32(params.ParkingTotal))
	if err != nil {
		log.Printf("[Construct-CreateManyParkingSpaces] error creating parking spaces: %v", err)
		http.Error(w, "error creating parking spaces: "+err.Error(), http.StatusBadRequest)
		return errors.New("[Construct] error creating parking spaces: " + err.Error())
	}
	log.Println("[Construct-CreateManyParkingSpaces] created parking spaces successfully")

	aCount := 0
	for _, building := range params.Buildings {

		buildingParams := db.CreateBuildingParams{
			ParkingTotal:   pgtype.Int8{Int64: int64(params.ParkingTotal), Valid: true},
			PerUserParking: pgtype.Int8{Int64: int64(params.PerUserParking), Valid: true},
			ManagementID:   adminUser.ID,
		}
		buildingResponse, err := queries.CreateBuilding(r.Context(), buildingParams)
		if err != nil {
			log.Printf("[Construct-Create-Building] error creating building: %v", buildingResponse)
			return errors.New("[Construct] error creating building: " + err.Error())
		}

		for i := 0; i < building.FloorNumbers; i++ {
			for j := 0; j < building.NumberOfRooms; j++ {
				sqft, err := faker.RandomInt(500, 2000)
				if err != nil {
					log.Printf("[Construct-RandomInt] error generating random integer: %v", err)
					return errors.New("[Construct] error creating apartment: " + err.Error())
				}

				unitNum, err := strconv.Atoi(fmt.Sprintf("%d%d%02d", building.BuildingNumber, i+1, j+1))
				if err != nil {
					log.Printf("[Construct-UnitNum] error generating unit number: %v", err)
					return errors.New("[Construct] error creating apartment: " + err.Error())
				}

				_, err = queries.CreateApartment(r.Context(), db.CreateApartmentParams{
					UnitNumber:   pgtype.Int8{Int64: int64(unitNum), Valid: true},
					Price:        utils.ConvertToPgTypeNumeric(2 * sqft[0]),
					Size:         pgtype.Int2{Int16: int16(sqft[0]), Valid: true},
					ManagementID: adminUser.ID,
					BuildingID:   buildingResponse.ID,
					Availability: true,
				})
				if err != nil {
					log.Printf("[Construct-Create-Apartment] error creating apartment: %v", err)
					return fmt.Errorf("[Construct] error creating apartment: %d %v", adminUser.ID, err.Error())
				}
				aCount++
			}
		}
	}

	log.Printf("[Construct] apartments seeded successfully: %d apartments created", aCount)
	return nil
}

// BuildingHandler handles building-related operations
type BuildingHandler struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

// NewBuildingHandler creates a new BuildingHandler instance
func NewBuildingHandler(pool *pgxpool.Pool, queries *db.Queries) *BuildingHandler {
	return &BuildingHandler{
		pool:    pool,
		queries: queries,
	}
}

// UpdateBuildingRequest is used to parse the request body for building updates
type UpdateBuildingRequest struct {
	BuildingNumber int `json:"buildingNumber"`
	FloorNumbers   int `json:"floorNumbers"`
	NumberOfRooms  int `json:"numberOfRooms"`
	ParkingTotal   int `json:"parkingTotal"`
	PerUserParking int `json:"perUserParking"`
}

// UpdateBuildingHandler updates an existing building
func (h BuildingHandler) UpdateBuildingHandler(w http.ResponseWriter, r *http.Request) {
	// Get admin context and verify authorization
	adminCtxt := middleware.GetUserCtx(r)
	if adminCtxt == nil {
		log.Println("[UpdateBuilding] no admin context found")
		http.Error(w, "no admin context found", http.StatusUnauthorized)
		return
	}

	// Get building ID from URL parameter
	buildingIDStr := chi.URLParam(r, "id")
	buildingID, err := strconv.ParseInt(buildingIDStr, 10, 64)
	if err != nil {
		log.Printf("[UpdateBuilding] error parsing building ID: %v", err)
		http.Error(w, "Invalid building ID", http.StatusBadRequest)
		return
	}

	// Decode request body
	var updateReq UpdateBuildingRequest
	if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
		log.Printf("[UpdateBuilding] error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Verify admin permissions
	adminClerkID := adminCtxt.ID
	adminUser, err := h.queries.GetUser(r.Context(), adminClerkID)
	if err != nil {
		log.Printf("[UpdateBuilding] cannot retrieve admin: %v", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if adminUser.Role != db.RoleAdmin {
		log.Printf("[UpdateBuilding] unauthorized user")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Update the building directly (no need to fetch it first)
	err = h.queries.UpdateBuilding(r.Context(), db.UpdateBuildingParams{
		ID:             buildingID,
		ParkingTotal:   pgtype.Int8{Int64: int64(updateReq.ParkingTotal), Valid: true},
		PerUserParking: pgtype.Int8{Int64: int64(updateReq.PerUserParking), Valid: true},
	})
	if err != nil {
		log.Printf("[UpdateBuilding] error updating building: %v", err)
		http.Error(w, "Failed to update building", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	response := map[string]interface{}{
		"message": fmt.Sprintf("Building %d updated successfully", buildingID),
		"id":      buildingID,
	}
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[UpdateBuilding] error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
