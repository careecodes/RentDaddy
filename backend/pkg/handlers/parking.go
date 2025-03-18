package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/internal/utils"
	"github.com/clerk/clerk-sdk-go/v2/user"
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

type CreatePermitRequest struct {
	PermitNumber string    `json:"permit_number"`
	ExpiresAt    time.Time `json:"expires_at"`
}

func (p ParkingPermitHandler) CreateParkingPermitHandler(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed reading body: %v", err)
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}
	var req CreatePermitRequest
	if err := json.Unmarshal(body, &req); err != nil {
		log.Printf("[PARKING_HANDLER] Failed parsing JSON: %v", err)
		http.Error(w, "Error parsing JSON", http.StatusInternalServerError)
		return
	}

	clerkID := chi.URLParam(r, "clerk_id")

	userData, err := user.Get(r.Context(), clerkID)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed querying clerk user data: %v", err)
		http.Error(w, "Error Clerk user not found ", http.StatusNotFound)
		return
	}

	var userMetadata ClerkUserPublicMetaData
	err = json.Unmarshal(userData.PublicMetadata, &userMetadata)
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

	permit, err := p.queries.CreateParkingPermit(r.Context(), db.CreateParkingPermitParams{
		PermitNumber: utils.ConvertStringToInt64(req.PermitNumber),
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
	json.NewEncoder(w).Encode(permit)
}
