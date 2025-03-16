package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PermitHandler struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewPermitHandler(pool *pgxpool.Pool, queries *db.Queries) *PermitHandler {
	return &PermitHandler{
		pool,
		queries,
	}
}

type CreatePermitRequest struct {
	PermitNumber string    `json:"permit_number"`
	ExpiresAt    time.Time `json:"expires_at"`
}

func ConvertStringToInt64(input string) int64 {
	newNum, err := strconv.Atoi(input)
	if err != nil {
		fmt.Println(err)
	}

	return int64(newNum)
}

func (p PermitHandler) CreateParkingPermitHandler(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[Parking_Handler] Failed reading body: %v", err)
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}
	var req CreatePermitRequest
	if err := json.Unmarshal(body, &req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	clerkID := chi.URLParam(r, "clerk_id")
	count, err := p.queries.GetNumOfUserParkingPermits(r.Context(), ConvertStringToInt64(clerkID))
	if err != nil {

		http.Error(w, "Could not retrieve permit count", http.StatusInternalServerError)
		return
	}

	if count >= 2 {
		http.Error(w, "Permit limit reached", http.StatusForbidden)
		return
	}

	permit, err := p.queries.CreateParkingPermit(r.Context(), db.CreateParkingPermitParams{
		PermitNumber: ConvertStringToInt64(req.PermitNumber),
		CreatedBy:    ConvertStringToInt64(clerkID),
		UpdatedAt: pgtype.Timestamp{
			Time:  time.Time{}.UTC(),
			Valid: true,
		},
		ExpiresAt: pgtype.Timestamp{
			Time:  time.Now().UTC().Add(time.Duration(5) * 24 * time.Hour),
			Valid: true,
		},
	})
	if err != nil {
		http.Error(w, "Failed to create parking permit", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(permit)
}
