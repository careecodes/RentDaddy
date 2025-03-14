package handlers

import (
	"encoding/json"
	"log"
	"math/big"
	"net/http"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// LeaseHandler encapsulates dependencies for lease-related handlers
type LeaseHandler struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

// NewLeaseHandler initializes a LeaseHandler
func NewLeaseHandler(pool *pgxpool.Pool, queries *db.Queries) *LeaseHandler {
	return &LeaseHandler{
		pool:    pool,
		queries: queries,
	}
}

// Convert float64 to pgtype.Numeric
func floatToPgNumeric(value float64) pgtype.Numeric {
	bigFloat := big.NewFloat(value)
	bigInt, accuracy := bigFloat.Int(nil)
	exp := int32(0)
	if accuracy != big.Exact {
		exp = -2 // Adjust precision if necessary
	}

	return pgtype.Numeric{
		Int:   bigInt,
		Exp:   exp,
		Valid: true,
	}
}

type CreateLeaseRequest struct {
	TenantID      int64     `json:"tenant_id"`
	LandlordID    int64     `json:"landlord_id"`
	StartDate     time.Time `json:"start_date"`
	EndDate       time.Time `json:"end_date"`
	RentAmount    float64   `json:"rent_amount"`
	DocumentTitle string    `json:"document_title"`
	CreatedBy     int64     `json:"created_by"`
}

type CreateLeaseResponse struct {
	LeaseID       int64  `json:"lease_id"`
	ExternalDocID string `json:"external_doc_id,omitempty"`
	DocumensoURL  string `json:"documenso_url,omitempty"`
	LeaseStatus   string `json:"lease_status"`
}

func (h *LeaseHandler) CreateLease(w http.ResponseWriter, r *http.Request) {
	var req CreateLeaseRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondWithError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	if req.TenantID == 0 || req.LandlordID == 0 || req.StartDate.IsZero() || req.EndDate.IsZero() || req.RentAmount <= 0 || req.CreatedBy == 0 {
		h.respondWithError(w, http.StatusBadRequest, "Missing or invalid fields")
		return
	}

	leaseID, err := h.queries.CreateLease(r.Context(), db.CreateLeaseParams{
		LeaseNumber:    0, // Auto-generated lease number
		ExternalDocID:  "",
		TenantID:       req.TenantID,
		LandlordID:     req.LandlordID,
		ApartmentID:    pgtype.Int8{Int64: 0, Valid: false},
		LeaseStartDate: pgtype.Date{Time: req.StartDate, Valid: true},
		LeaseEndDate:   pgtype.Date{Time: req.EndDate, Valid: true},
		RentAmount:     floatToPgNumeric(req.RentAmount),
		LeaseStatus:    "active",
		CreatedBy:      req.CreatedBy,
		UpdatedBy:      req.CreatedBy, // Initially same as CreatedBy
	})
	if err != nil {
		log.Printf("[LEASE_HANDLER] Database insert error: %v", err)
		h.respondWithError(w, http.StatusInternalServerError, "Database insert failed")
		return
	}

	h.respondWithJSON(w, http.StatusOK, CreateLeaseResponse{
		LeaseID:     leaseID,
		LeaseStatus: "active",
	})
}

// Utility functions for response handling
func (h *LeaseHandler) respondWithError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if err := json.NewEncoder(w).Encode(map[string]string{"error": message}); err != nil {
		log.Printf("[LEASE_HANDLER] Failed to encode response: %v", err)
		http.Error(w, `{"error": "Failed to encode response"}`, http.StatusInternalServerError)
	}
}

func (h *LeaseHandler) respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("[LEASE_HANDLER] Failed to encode response: %v", err)
		http.Error(w, `{"error": "Failed to encode response"}`, http.StatusInternalServerError)
	}
}
