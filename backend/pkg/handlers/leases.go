package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/jackc/pgx/v5/pgtype"
)

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

func CreateLeaseHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	var req CreateLeaseRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error": "Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	if req.TenantID == 0 || req.LandlordID == 0 || req.StartDate.IsZero() || req.EndDate.IsZero() || req.RentAmount <= 0 || req.CreatedBy == 0 {
		http.Error(w, `{"error": "Missing or invalid fields"}`, http.StatusBadRequest)
		return
	}

	leaseID, err := queries.CreateLease(r.Context(), db.CreateLeaseParams{
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
		log.Printf("Database insert error: %v", err)
		http.Error(w, fmt.Sprintf(`{"error": "Database insert failed: %v"}`, err), http.StatusInternalServerError)
		return
	}

	resp := CreateLeaseResponse{
		LeaseID:     leaseID,
		LeaseStatus: "active",
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}
}
