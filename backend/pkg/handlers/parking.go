package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/middleware"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CreateParkingPermitRequest struct {
	LicensePlate string `json:"license_plate"`
	CarColor     string `json:"car_color"`
	CarMake      string `json:"car_make"`
	CreatedBy    string `json:"created_by"`
}

type UpdateParkingPermitRequest struct {
	LicensePlate string `json:"license_plate"`
	CarColor     string `json:"car_color"`
	CarMake      string `json:"car_make"`
	CreatedBy    string `json:"created_by"`
}

type ParkingPermitHandler struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewParkingPermitHandler(pool *pgxpool.Pool, queries *db.Queries) *ParkingPermitHandler {
	return &ParkingPermitHandler{
		pool,
		queries,
	}
}

// ADMIN START
func (p ParkingPermitHandler) CreateParkingPermit(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed reading body: %v", err)
		http.Error(w, "Error reading body", http.StatusInternalServerError)
		return
	}

	var parkingPermitReq CreateParkingPermitRequest
	err = json.Unmarshal(body, &parkingPermitReq)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed parsing JSON: %v", err)
		http.Error(w, "Error parsing JSON", http.StatusInternalServerError)
		return
	}

	userCtx, err := user.Get(r.Context(), parkingPermitReq.CreatedBy)
	if err != nil {
		log.Println("[PARKING_HANDLER] Failed user not found")
		http.Error(w, "Error user not found", http.StatusNotFound)
		return
	}

	var userMetadata ClerkUserPublicMetaData
	err = json.Unmarshal(userCtx.PublicMetadata, &userMetadata)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed parsing user Clerk metadata: %v", err)
		http.Error(w, "Error parsing user Clerk metadata", http.StatusBadRequest)
		return
	}

	dbID := pgtype.Int8{Int64: int64(userMetadata.DbId), Valid: true}
	tenantParkingPermits, err := p.queries.GetTenantParkingPermits(r.Context(), dbID)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed querying parking permits for user: %v", err)
		http.Error(w, "Error querying parking permits", http.StatusInternalServerError)
		return
	}

	if len(tenantParkingPermits) >= 2 {
		today := time.Now()
		var validPermits []db.ParkingPermit
		for _, permit := range tenantParkingPermits {
			if permit.ExpiresAt.Valid && permit.ExpiresAt.Time.Before(today) {
				log.Printf("Parking permit expired refreshing: %d", permit.ID)
				if err := p.queries.UpdateParkingPermit(r.Context(), db.UpdateParkingPermitParams{
					ID:           0,
					LicensePlate: pgtype.Text{},
					CarMake:      pgtype.Text{},
					CarColor:     pgtype.Text{},
					CreatedBy:    pgtype.Int8{},
					ExpiresAt:    pgtype.Timestamp{},
				}); err != nil {
					log.Printf("[PARKING_HANDLER] User hit parking permit limit: %d Error: %v", len(tenantParkingPermits), err)
					http.Error(w, "Error parking permit limit reached", http.StatusForbidden)
					return
				}
			} else {
				validPermits = append(validPermits, permit)
			}
		}

		if len(validPermits) >= 2 {
			log.Printf("[PARKING_HANDLER] User hit parking permit limit: %d Error: %v", len(validPermits), err)
			http.Error(w, "Error parking permit limit reached", http.StatusForbidden)
			return
		}
	}

	err = p.queries.UpdateParkingPermit(r.Context(), db.UpdateParkingPermitParams{
		LicensePlate: pgtype.Text{String: parkingPermitReq.LicensePlate, Valid: true},
		CarMake:      pgtype.Text{String: parkingPermitReq.CarMake, Valid: true},
		CarColor:     pgtype.Text{String: parkingPermitReq.CarColor, Valid: true},
		CreatedBy:    pgtype.Int8{Int64: int64(userMetadata.DbId), Valid: true},
		ExpiresAt: pgtype.Timestamp{
			Time: time.Now().UTC().Add(time.Duration(5) * 24 * time.Hour),
		},
	})

	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed creating parking permit: %v", err)
		http.Error(w, "Failed to create parking permit", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(parkingPermitReq)
}

func (p ParkingPermitHandler) GetParkingPermits(w http.ResponseWriter, r *http.Request) {
	parkingPermits, err := p.queries.ListParkingPermits(r.Context())
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed querying parking permits: %v", err)
		http.Error(w, "Error get all parking permits", http.StatusInternalServerError)
		return
	}

	res, err := json.Marshal(parkingPermits)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed converting to JSON: %v", err)
		http.Error(w, "Error converting to JSON", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(res))
}

func (p ParkingPermitHandler) GetParkingPermit(w http.ResponseWriter, r *http.Request) {
	permitIdStr := chi.URLParam(r, "permit_id")
	if permitIdStr == "" {
		log.Println("[PARKING_HANDLER] Invalid permit_number param")
		http.Error(w, "Error invalid permit_number param", http.StatusBadRequest)
		return
	}

	permitId, err := strconv.Atoi(permitIdStr)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed converting permit_number to int: %v", err)
		http.Error(w, "Error converting permit_number param", http.StatusInternalServerError)
		return
	}

	parkingPermit, err := p.queries.GetParkingPermit(r.Context(), int64(permitId))
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed querying parking permit: %v", err)
		http.Error(w, "Error querying parking permit", http.StatusNotFound)
		return
	}

	res, err := json.Marshal(parkingPermit)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed converting to JSON: %v", err)
		http.Error(w, "Error converting to JSON", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(res))
}

func (p ParkingPermitHandler) DeleteParkingPermit(w http.ResponseWriter, r *http.Request) {
	parkingPermitIdStr := chi.URLParam(r, "permit_id")

	if parkingPermitIdStr == "" {
		log.Println("[PARKING_HANDLER] Invalid parking_permit_id")
		http.Error(w, "Error converting param", http.StatusBadRequest)
		return
	}

	parkingPermitId, err := strconv.Atoi(parkingPermitIdStr)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failedconverting param: %v", err)
		http.Error(w, "Error converting param", http.StatusInternalServerError)
		return
	}

	if err = p.queries.ClearParkingPermit(r.Context(), int64(parkingPermitId)); err != nil {
		log.Printf("[PARKING_HANDLER] Failed deleting parking permit: %v", err)
		http.Error(w, "Error deleting parking permit", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Successfully deleted"))
}

// TENANT START
func (p ParkingPermitHandler) TenantGetParkingPermit(w http.ResponseWriter, r *http.Request) {
	permitNumberStr := chi.URLParam(r, "permit_number")

	permitNumber, err := strconv.Atoi(permitNumberStr)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed converting permit_number to int: %v", err)
		http.Error(w, "Error converting permit_number param", http.StatusInternalServerError)
		return
	}

	userCtx := middleware.GetUserCtx(r)
	if userCtx == nil {
		log.Println("[PARKING_HANDLER] Failed no user CTX")
		http.Error(w, "Error no user CTX", http.StatusNotFound)
		return
	}

	var userMetadata ClerkUserPublicMetaData
	err = json.Unmarshal(userCtx.PublicMetadata, &userMetadata)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed parsing user Clerk metadata: %v", err)
		http.Error(w, "Error parsing user clerk metadata", http.StatusBadRequest)
		return
	}

	res, err := p.queries.GetParkingPermit(r.Context(), int64(permitNumber))
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed querying parking_number: %v", err)
		http.Error(w, "Failed querying parking_permit", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}

func (p ParkingPermitHandler) TenantGetParkingPermits(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserCtx(r)
	if userCtx == nil {
		log.Printf("[USER_HANDLER] No user CTX")
		http.Error(w, "Error No user CTX", http.StatusUnauthorized)
		return
	}

	log.Printf("Current user ID: %s", userCtx.ID)

	parkingPermits, err := p.queries.ListParkingPermits(r.Context())
	if err != nil {
		log.Printf("[USER_HANDLER] Fiailed querying user parking permits: %v", err)
		http.Error(w, "Error querying user parking permits", http.StatusInternalServerError)
		return
	}

	jsonRes, err := json.Marshal(parkingPermits)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed converting parking permits to JSON: %v", err)
		http.Error(w, "Error converting parking permits to JSON", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonRes))
}

func (p ParkingPermitHandler) TenantCreateParkingPermit(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserCtx(r)
	if userCtx == nil {
		log.Println("[PARKING_HANDLER] Failed no user context")
		http.Error(w, "Error no user context", http.StatusUnauthorized)
		return
	}

	var userMetadata ClerkUserPublicMetaData
	err := json.Unmarshal(userCtx.PublicMetadata, &userMetadata)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed parsing user Clerk metadata: %v", err)
		http.Error(w, "Error parsing user clerk metadata", http.StatusBadRequest)
		return
	}

	permitNumberStr := chi.URLParam(r, "permit_number")
	permitNumber, err := strconv.Atoi(permitNumberStr)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed converting permit_number to int: %v", err)
		http.Error(w, "Error converting permit_number param", http.StatusInternalServerError)
		return
	}

	var parkingPermitReq UpdateParkingPermitRequest
	_ = json.NewDecoder(r.Body).Decode(&parkingPermitReq)

	tenantParkingPermits, err := p.queries.GetTenantParkingPermits(r.Context(), pgtype.Int8{Int64: int64(userMetadata.DbId), Valid: true})
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed querying parking permits for user: %v", err)
		http.Error(w, "Error querying parking permits", http.StatusInternalServerError)
		return
	}

	if len(tenantParkingPermits) >= 2 {
		today := time.Now()
		var validPermits []db.ParkingPermit
		for _, permit := range tenantParkingPermits {
			if permit.ExpiresAt.Valid && permit.ExpiresAt.Time.Before(today) {
				log.Printf("Parking permit expired deleting: %d", permit.ID)
				if err := p.queries.ClearParkingPermit(r.Context(), int64(permitNumber)); err != nil {
					log.Printf("[PARKING_HANDLER] User hit parking permit limit: %d Error: %v", len(tenantParkingPermits), err)
					http.Error(w, "Error parking permit limit reached", http.StatusForbidden)
					return
				}
			} else {
				validPermits = append(validPermits, permit)
			}
		}

		if len(validPermits) >= 2 {
			log.Printf("[PARKING_HANDLER] User hit parking permit limit: %d Error: %v", len(validPermits), err)
			http.Error(w, "Error parking permit limit reached", http.StatusForbidden)
			return

		}
	}

	newPermit, err := p.queries.GetAvailableParkingPermit(r.Context())
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed getting available parking permit: %v", err)
		http.Error(w, "Failed to get available parking permit", http.StatusInternalServerError)
		return
	}

	err = p.queries.UpdateParkingPermit(r.Context(), db.UpdateParkingPermitParams{
		ID:           newPermit.ID,
		LicensePlate: pgtype.Text{String: parkingPermitReq.LicensePlate, Valid: true},
		CarMake:      pgtype.Text{String: parkingPermitReq.CarMake, Valid: true},
		CarColor:     pgtype.Text{String: parkingPermitReq.CarColor, Valid: true},
		CreatedBy:    pgtype.Int8{Int64: int64(userMetadata.DbId), Valid: true},
		ExpiresAt: pgtype.Timestamp{
			Time:  time.Now().UTC().Add(time.Duration(5) * 24 * time.Hour),
			Valid: true,
		},
	})
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed up parking permit: %v", err)
		http.Error(w, "Failed to create parking permit", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(newPermit)
}
