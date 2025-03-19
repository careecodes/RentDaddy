package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

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

func (p ParkingPermitHandler) CreateParkingPermitHandler(w http.ResponseWriter, r *http.Request) {
	permitNumberStr := chi.URLParam(r, "permit_number")

	permitNumber, err := strconv.Atoi(permitNumberStr)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed converting permit_number to int: %v", err)
		http.Error(w, "Error converting permit_number param", http.StatusInternalServerError)
		return
	}

	userCtx, err := middleware.GetClerkUser(r)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed no user context: %v", err)
		http.Error(w, "Error no user context", http.StatusInternalServerError)
		return
	}

	// Shouldnt need this anymore
	// clerkID := chi.URLParam(r, "clerk_id")
	//
	// userData, err := user.Get(r.Context(), clerkID)
	// if err != nil {
	// 	log.Printf("[PARKING_HANDLER] Failed querying clerk user data: %v", err)
	// 	http.Error(w, "Error Clerk user not found ", http.StatusNotFound)
	// 	return
	// }

	var userMetadata ClerkUserPublicMetaData
	err = json.Unmarshal(userCtx.PublicMetadata, &userMetadata)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed parsing user Clerk metadata: %v", err)
		http.Error(w, "Error parsing user clerk metadata", http.StatusBadRequest)
		return
	}

	count, err := p.queries.GetNumOfUserParkingPermits(r.Context(), int64(userMetadata.DbId))
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed querying parking permits for user: %v", err)
		http.Error(w, "Error querying parking permits", http.StatusInternalServerError)
		return
	}

	if count >= 2 {
		log.Printf("[PARKING_HANDLER] User hit parking permit limit: %d Error: %v", count, err)
		http.Error(w, "Error parking permit limit reached", http.StatusForbidden)
		return
	}

	res, err := p.queries.CreateParkingPermit(r.Context(), db.CreateParkingPermitParams{
		PermitNumber: int64(permitNumber),
		CreatedBy:    int64(userMetadata.DbId),
		ExpiresAt: pgtype.Timestamp{
			Time:  time.Now().UTC().Add(time.Duration(5) * 24 * time.Hour),
			Valid: true,
		},
	})
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed creating parking permit: %v", err)
		http.Error(w, "Failed to create parking permit", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res)
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
	permitNumberStr := chi.URLParam(r, "permit_number")
	if permitNumberStr == "" {
		log.Println("[PARKING_HANDLER] invalid permit_number param")
		http.Error(w, "Error invalid permit_number param", http.StatusBadRequest)
		return
	}

	permitNumber, err := strconv.Atoi(permitNumberStr)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed converting permit_number to int: %v", err)
		http.Error(w, "Error converting permit_number param", http.StatusInternalServerError)
		return
	}

	parkingPermit, err := p.queries.GetParkingPermit(r.Context(), int64(permitNumber))
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
