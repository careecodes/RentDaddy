package handlers

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"math/big"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jung-kurt/gofpdf"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
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

// Create Lease Request Struct
type CreateLeaseRequest struct {
	TenantID      int64     `json:"tenant_id"`
	LandlordID    int64     `json:"landlord_id"`
	ApartmentID   int64     `json:"apartment_id"`
	StartDate     time.Time `json:"start_date"`
	EndDate       time.Time `json:"end_date"`
	RentAmount    float64   `json:"rent_amount"`
	LeaseStatus   string    `json:"lease_status"`
	ExternalDocID string    `json:"external_doc_id,omitempty"`
	DocumentTitle string    `json:"document_title"`
	CreatedBy     int64     `json:"created_by"`
}

// Convert `CreateLeaseRequest` to `db.CreateLeaseParams`
func (r CreateLeaseRequest) ToCreateLeaseParams(leasePdf []byte) db.CreateLeaseParams {
	return db.CreateLeaseParams{
		LeaseVersion:   1,
		ExternalDocID:  r.ExternalDocID,
		TenantID:       r.TenantID,
		LandlordID:     r.LandlordID,
		ApartmentID:    pgtype.Int8{Int64: r.ApartmentID, Valid: r.ApartmentID != 0},
		LeaseStartDate: pgtype.Date{Time: r.StartDate, Valid: !r.StartDate.IsZero()},
		LeaseEndDate:   pgtype.Date{Time: r.EndDate, Valid: !r.EndDate.IsZero()},
		RentAmount:     pgtype.Numeric{Int: big.NewInt(int64(r.RentAmount)), Exp: -2, Valid: true},
		LeaseStatus:    db.LeaseStatus(r.LeaseStatus),
		LeasePdf:       leasePdf,
		CreatedBy:      r.CreatedBy,
	}
}

// Create Lease Response Struct
type CreateLeaseResponse struct {
	LeaseID         int64  `json:"lease_id"`
	ExternalDocID   string `json:"external_doc_id,omitempty"`
	LeaseStatus     string `json:"lease_status"`
	LeasePDF        string `json:"lease_pdf,omitempty"`
	LeaseSigningURL string `json:"lease_signing_url"`
}

// Convert `db.Lease` to `CreateLeaseResponse`
func NewCreateLeaseResponse(lease db.Lease) CreateLeaseResponse {
	return CreateLeaseResponse{
		LeaseID:         lease.ID,
		ExternalDocID:   lease.ExternalDocID,
		LeaseStatus:     string(lease.LeaseStatus),
		LeasePDF:        base64.StdEncoding.EncodeToString(lease.LeasePdf),
		LeaseSigningURL: "",
	}
}

// Generate Lease PDF
func (h *LeaseHandler) GenerateLeasePDF(title string, formData map[string]string) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(40, 10, "Lease Agreement: "+title)

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate lease PDF: %w", err)
	}
	return buf.Bytes(), nil
}

// Generate Signing URL (Documenso)
func (h *LeaseHandler) GenerateDocumensoURL(leaseID int64) (string, error) {
	return fmt.Sprintf("https://documenso.com/sign/%d", leaseID), nil
}

func (h *LeaseHandler) GetLeasePDF(w http.ResponseWriter, r *http.Request) {
	leaseIDStr := chi.URLParam(r, "leaseID")
	leaseID, err := strconv.ParseInt(leaseIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid lease ID", http.StatusBadRequest)
		return
	}

	lease, err := h.queries.GetLeaseByID(context.Background(), leaseID)
	if err != nil {
		http.Error(w, "Lease not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(lease.LeasePdf)
}
