package handlers

import (
	"bytes"
	"encoding/json"
	"errors"
	"path/filepath"

	"fmt"

	"io"
	"log"
	"math/big"
	"net/http"
	"os"

	"strconv"
	"strings"

	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jung-kurt/gofpdf"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/internal/smtp"

	"github.com/go-chi/chi/v5"

	"github.com/careecodes/RentDaddy/pkg/handlers/documenso"
)

/*

Lease Creation Summary:

Lease Signing Summary:

Lease Retrieval Summary:

Lease Termination Summary:

Lease Renewal Summary:

*/

// HARDCODED LANDLORD INFO FOR TESTING - need to do this with Clerk
var landlordID = int64(100)
var landlordName = "First Landlord"
var landlordEmail = "wrldconnect1@gmail.com"

// Temp dir for storing generated leases
var tempDir = os.Getenv("TEMP_DIR")

// LeaseHandler encapsulates dependencies for lease-related handlers
type LeaseHandler struct {
	pool             *pgxpool.Pool
	queries          *db.Queries
	documenso_client *documenso.DocumensoClient
}

// Helper for Create Lease Request Struct
func derefOrZero(ptr *int64) int64 {
	if ptr != nil {
		return *ptr
	}
	return 0
}

func (h *LeaseHandler) TerminateLease(w http.ResponseWriter, r *http.Request) {

	leaseIDStr := chi.URLParam(r, "leaseID")
	leaseID, err := strconv.Atoi(leaseIDStr)
	if err != nil {
		http.Error(w, "Invalid lease ID", http.StatusBadRequest)
		return
	}

	terminatedLease, err := h.queries.TerminateLease(r.Context(), db.TerminateLeaseParams{
		UpdatedBy: landlordID,
		ID:        int64(leaseID),
	})
	if err != nil {
		log.Printf("[LEASE_TERMINATE] Failed to terminate lease %d: %v", leaseID, err)
		http.Error(w, "Could not terminate lease", http.StatusInternalServerError)
		return
	}

	log.Printf("[LEASE_TERMINATE] Lease %d manually terminated by admin %d", leaseID, landlordID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"message":    "Lease terminated successfully",
		"terminated": true,
		"lease_id":   terminatedLease.ID,
		"status":     terminatedLease.Status,
	}); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// NewLeaseHandler initializes a LeaseHandler
func NewLeaseHandler(pool *pgxpool.Pool, queries *db.Queries) *LeaseHandler {
	baseURL := os.Getenv("DOCUMENSO_API_URL")
	apiKey := os.Getenv("DOCUMENSO_API_KEY")
	log.Printf("Documenso API URL: %s", baseURL)
	log.Printf("Documenso API Key: %s", apiKey)
	log.Printf("Documenso API URL: %s", baseURL)
	log.Printf("Documenso API Key: %s", apiKey)

	if tempDir == "" {
		tempDir = "/app/temp" // Default fallback
		tempDir = "/app/temp" // Default fallback
	}
	return &LeaseHandler{
		pool:             pool,
		queries:          queries,
		documenso_client: documenso.NewDocumensoClient(baseURL, apiKey),
	}
}

// Create Lease Response Struct
type CreateLeaseResponse struct {
	LeaseID         int64  `json:"lease_id"`
	ExternalDocID   string `json:"external_doc_id,omitempty"`
	Status          string `json:"lease_status"`
	LeasePDF        string `json:"lease_pdf,omitempty"`
	LeaseSigningURL string `json:"lease_signing_url"`
}

type LeaseValidationResult struct {
	StartDate time.Time
	EndDate   time.Time
	Validated LeaseWithSignersRequest
}

type LeaseUpsertRequest struct {
	TenantID        int64   `json:"tenant_id"`
	LandlordID      int64   `json:"landlord_id"`
	ApartmentID     int64   `json:"apartment_id"`
	StartDate       string  `json:"start_date"`
	EndDate         string  `json:"end_date"`
	RentAmount      float64 `json:"rent_amount"`
	Status          string  `json:"lease_status"`
	ExternalDocID   string  `json:"external_doc_id,omitempty"`
	DocumentTitle   string  `json:"document_title"`
	CreatedBy       int64   `json:"created_by"`
	UpdatedBy       int64   `json:"updated_by"`
	LeaseNumber     int64   `json:"lease_number"`
	PreviousLeaseID *int64  `json:"previous_lease_id,omitempty"`
	ReplaceExisting bool    `json:"replace_existing,omitempty"`
	TenantName      string  `json:"tenant_name"`
	TenantEmail     string  `json:"tenant_email"`
	PropertyAddress string  `json:"property_address"`
}

func (h *LeaseHandler) handleLeaseUpsert(w http.ResponseWriter, r *http.Request, req LeaseUpsertRequest) {
	// Set landlord ID if not provided
	if req.LandlordID == 0 {
		req.LandlordID = landlordID // Use the global landlord ID
	}
	req.UpdatedBy = landlordID
	req.CreatedBy = landlordID

	log.Println("[LEASE_UPSERT] Starting lease upsert handler")

	log.Println("[LEASE_UPSERT] Generating lease PDF")
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		log.Printf("[LEASE_UPSERT] Invalid start date format: %v", err)
		http.Error(w, "Invalid start date", http.StatusBadRequest)
		return
	}
	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		log.Printf("[LEASE_UPSERT] Invalid end date format: %v", err)
		http.Error(w, "Invalid end date", http.StatusBadRequest)
		return
	}

	conflict, err := h.queries.GetConflictingActiveLease(r.Context(), db.GetConflictingActiveLeaseParams{
		TenantID:       req.TenantID,
		LeaseStartDate: pgtype.Date{Time: startDate, Valid: true},
		LeaseEndDate:   pgtype.Date{Time: endDate, Valid: true},
	})

	if err == nil && conflict.ID != 0 {
		log.Printf("Tenant %d already has an active lease during the requested period", req.TenantID)
		http.Error(w, "Tenant already has an active lease during this period", http.StatusConflict)
		return
	}

	existing, err := h.queries.GetDuplicateLease(r.Context(), db.GetDuplicateLeaseParams{
		TenantID:    req.TenantID,
		ApartmentID: req.ApartmentID,
		Status:      db.LeaseStatus(req.Status),
	})

	if err == nil && existing.ID != 0 {
		log.Printf("[LEASE_UPSERT] Duplicate lease exists for tenant %d, apartment %d with status %s",
			req.TenantID, req.ApartmentID, req.Status)
		http.Error(w, "A lease already exists for this tenant, apartment, and status", http.StatusConflict)
		return
	}
	// Step 2: Generate the lease PDF
	pdfData, err := h.GenerateComprehensiveLeaseAgreement(
		req.DocumentTitle,
		landlordName, // TODO: Replace with actual landlord name lookup
		req.TenantName,
		req.PropertyAddress,
		req.RentAmount,
		startDate,
		endDate,
	)
	if err != nil {
		log.Printf("[LEASE_UPSERT] Error generating lease PDF: %v", err)
		http.Error(w, "Failed to generate lease PDF", http.StatusInternalServerError)
		return
	}
	log.Printf("[LEASE_UPSERT] Generated PDF for %s (%s)", req.TenantName, req.PropertyAddress)

	// Step 3: Upload to Documenso and populate fields
	log.Println("[LEASE_UPSERT] Uploading lease PDF to Documenso")
	docID, err := h.handleDocumensoUploadAndSetup(
		pdfData,
		LeaseWithSignersRequest{
			TenantName:      req.TenantName,
			TenantEmail:     req.TenantEmail,
			PropertyAddress: req.PropertyAddress,
			RentAmount:      req.RentAmount,
			StartDate:       startDate.Format("2006-01-02"),
			EndDate:         endDate.Format("2006-01-02"),
			DocumentTitle:   req.DocumentTitle,
		},
		landlordName, // TODO: replace with Clerk user context
		landlordEmail,
	)
	if err != nil {
		log.Printf("[LEASE_UPSERT] Documenso upload error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	log.Printf("[LEASE_UPSERT] Documenso Document ID: %s", docID)
	log.Printf("[LEASE_UPSERT] Signing URL: %s", docID)

	// Step 4: Create lease record in database
	log.Println("[LEASE_UPSERT] Inserting lease into database")

	leaseParams := db.RenewLeaseParams{
		LeaseNumber:     req.LeaseNumber,
		ExternalDocID:   docID,
		TenantID:        req.TenantID,
		LandlordID:      req.LandlordID,
		ApartmentID:     req.ApartmentID,
		LeaseStartDate:  pgtype.Date{Time: startDate, Valid: true},
		LeaseEndDate:    pgtype.Date{Time: endDate, Valid: true},
		RentAmount:      pgtype.Numeric{Int: big.NewInt(int64(req.RentAmount * 100)), Exp: -2, Valid: true},
		Status:          db.LeaseStatus(req.Status),
		LeasePdf:        pdfData,
		CreatedBy:       req.CreatedBy,
		UpdatedBy:       req.UpdatedBy,
		PreviousLeaseID: pgtype.Int8{Int64: derefOrZero(req.PreviousLeaseID), Valid: req.PreviousLeaseID != nil},
	}
	log.Printf(" [LEASE_UPSERT] Status: %v ", leaseParams.Status)
	row, err := h.queries.RenewLease(r.Context(), leaseParams)
	if err != nil {
		log.Printf("[LEASE_UPSERT] Database insert error: %v", err)
		http.Error(w, "Failed to save lease", http.StatusInternalServerError)
		return
	}

	// Step 5: Respond to client with success
	log.Printf("[LEASE_UPSERT] Lease created/renewed successfully with ID: %d", row.ID)
	resp := map[string]interface{}{
		"lease_id":        row.ID,
		"lease_number":    row.LeaseNumber,
		"external_doc_id": docID,
		"sign_url":        h.documenso_client.GetSigningURL(docID),
		"status":          req.Status,
		"message":         "Lease created/renewed successfully with signing url.",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		log.Printf("Error encoding response: %v", err)
		return
	}
}

func (h *LeaseHandler) GetLeases(w http.ResponseWriter, r *http.Request) {
	leases, err := h.queries.ListLeases(r.Context())
	if err != nil {
		log.Printf("Error retrieving leases: %v", err)
		http.Error(w, "Failed to fetch leases", http.StatusInternalServerError)
		return
	}

	var leaseResponses []map[string]interface{}
	for _, lease := range leases {
		// Fetch tenant name
		tenant, err := h.queries.GetUserByID(r.Context(), lease.TenantID)
		if err != nil {
			log.Printf("Warning: Could not fetch tenant name for ID %d", lease.TenantID)
		}

		// Fetch apartment details
		apartment, err := h.queries.GetApartment(r.Context(), lease.ApartmentID)
		if err != nil {
			log.Printf("Warning: Could not fetch apartment name for ID %d", lease.ApartmentID)
		}

		// Convert to db.Lease to use our helper method
		dbLease := db.Lease{
			ID:             lease.ID,
			Status:         lease.Status,
			LeaseStartDate: lease.LeaseStartDate,
			LeaseEndDate:   lease.LeaseEndDate,
		}
		status := h.GetLeaseStatus(dbLease)

		// Add data to response array
		leaseResponses = append(leaseResponses, map[string]interface{}{
			"id":             lease.ID,
			"tenantName":     tenant.FirstName + " " + tenant.LastName,
			"apartment":      apartment.UnitNumber,
			"leaseStartDate": lease.LeaseStartDate.Time.Format("2006-01-02"),
			"leaseEndDate":   lease.LeaseEndDate.Time.Format("2006-01-02"),
			"rentAmount":     lease.RentAmount.Int.String(),
			"status":         status,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(leaseResponses); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		log.Printf("Error encoding lease responses: %v", err)
		return
	}
}

// You can update calculateLeaseStatus to accept both types,
// but for simplicity, we've embedded the logic directly in GetLeases

// For other places where you need to calculate the status for a db.Lease:
func calculateLeaseStatus(lease db.Lease) string {
	// Special statuses that override date-based calculation
	if string(lease.Status) == "terminated" ||
		string(lease.Status) == "draft" ||
		string(lease.Status) == "pending_tenant_approval" ||
		string(lease.Status) == "pending_landlord_approval" {
		return string(lease.Status)
	}

	// Calculate date-based statuses
	today := time.Now()
	leaseEnd := lease.LeaseEndDate.Time

	if leaseEnd.Before(today) {
		return "expired"
	}

	// Check if lease expires within 60 days
	daysUntilExpiration := leaseEnd.Sub(today).Hours() / 24
	if daysUntilExpiration <= 60 {
		return "expires_soon"
	}

	return "active"
}

// GetLeaseStatus is a helper method that returns the current status of a lease
// This centralizes lease status calculation logic and can be used anywhere a status check is needed
func (h *LeaseHandler) GetLeaseStatus(lease db.Lease) string {
	// Special statuses that override date-based calculation
	if string(lease.Status) == "terminated" ||
		string(lease.Status) == "draft" ||
		string(lease.Status) == "pending_tenant_approval" ||
		string(lease.Status) == "pending_landlord_approval" {
		return string(lease.Status)
	}

	// Calculate date-based statuses
	today := time.Now()
	leaseEnd := lease.LeaseEndDate.Time

	if leaseEnd.Before(today) {
		return "expired"
	}

	// Check if lease expires within 60 days
	daysUntilExpiration := leaseEnd.Sub(today).Hours() / 24
	if daysUntilExpiration <= 60 {
		return "expires_soon"
	}

	return "active"
}

// UpdateAllLeaseStatuses handles updating expired lease statuses only
// This endpoint is designed to be called by a cron job
func (h *LeaseHandler) UpdateAllLeaseStatuses(w http.ResponseWriter, r *http.Request) {
	log.Println("[LEASE_STATUS_UPDATE] Starting daily lease status update")

	// Only expire leases that have ended today
	count, err := h.queries.ExpireLeasesEndingToday(r.Context())
	if err != nil {
		log.Printf("[LEASE_STATUS_UPDATE] Failed to expire leases: %v", err)
		http.Error(w, "Failed to expire leases", http.StatusInternalServerError)
		return
	}
	log.Printf("[LEASE_STATUS_UPDATE] Successfully expired %d leases", count)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	response := map[string]interface{}{
		"message":       "Successfully updated expired leases",
		"expired_count": count,
	}
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[LEASE_STATUS_UPDATE] Error encoding response: %v", err)
	}
}

// This can be part of the mignight cron job instead of its own function
func calculateLeaseStatusFromRow(lease db.ListLeasesRow) string {
	// Special statuses that override date-based calculation
	if string(lease.Status) == "terminated" ||
		string(lease.Status) == "draft" ||
		string(lease.Status) == "pending_tenant_approval" ||
		string(lease.Status) == "pending_landlord_approval" {
		return string(lease.Status)
	}

	// Calculate date-based statuses
	today := time.Now()
	leaseEnd := lease.LeaseEndDate.Time

	if leaseEnd.Before(today) {
		return "expired"
	}

	// Check if lease expires within 60 days
	daysUntilExpiration := leaseEnd.Sub(today).Hours() / 24
	if daysUntilExpiration <= 60 {
		return "expires_soon"
	}

	return "active"
}

func (h *LeaseHandler) GetTenantsWithoutLease(w http.ResponseWriter, r *http.Request) {

	// Get tenants without lease from database
	tenants, err := h.queries.GetTenantsWithNoLease(r.Context())
	if err != nil {
		http.Error(w, "Failed to get tenants: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Convert to JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(tenants); err != nil {
		http.Error(w, "Failed to encode tenants response", http.StatusInternalServerError)
		log.Printf("Error encoding tenants response: %v", err)
		return
	}
}

// GetApartmentsWithoutLease retrieves all apartments that are not currently leased
func (h *LeaseHandler) GetApartmentsWithoutLease(w http.ResponseWriter, r *http.Request) {
	log.Println("Fetching apartments without leases...")

	// Get apartments without lease from database
	apartments, err := h.queries.GetApartmentsWithoutLease(r.Context())
	if err != nil {
		log.Printf("Error retrieving apartments: %v", err)
		http.Error(w, "Failed to get apartments: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("Found %d available apartments", len(apartments))

	// For debugging purposes, log the first few apartments
	if len(apartments) > 0 {
		log.Printf("First apartment: ID=%d, Unit=%s, Price=%v",
			apartments[0].ID, strconv.Itoa(int(apartments[0].UnitNumber)), apartments[0].Price)
	}

	// Convert to JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(apartments); err != nil {
		log.Printf("Error encoding apartments response: %v", err)
		http.Error(w, "Failed to encode apartments response", http.StatusInternalServerError)
		return
	}
}

// LeaseWithSignersRequest represents the request for creating a lease with signers
type LeaseWithSignersRequest struct {
	// User IDs for database relations
	TenantID    int64 `json:"tenant_id"`
	LandlordID  int64 `json:"landlord_id,omitempty"` // Only used as fallback if auth context is missing
	ApartmentID int64 `json:"apartment_id"`

	// Tenant information (used if tenant_id lookup fails)
	TenantName  string `json:"tenant_name"`
	TenantEmail string `json:"tenant_email"`

	// Property information
	PropertyAddress string  `json:"property_address"`
	RentAmount      float64 `json:"rent_amount"`

	// Lease dates
	StartDate string `json:"start_date"` // Format: YYYY-MM-DD
	EndDate   string `json:"end_date"`   // Format: YYYY-MM-DD

	// Document metadata
	DocumentTitle string `json:"document_title,omitempty"`
}

func (h LeaseHandler) GetLeaseWithFields(w http.ResponseWriter, r *http.Request) {
	leaseIDStr := chi.URLParam(r, "leaseID")
	leaseID, err := strconv.ParseInt(leaseIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid lease ID", http.StatusBadRequest)
		return
	}

	// Retrieve lease details from DB
	lease, err := h.queries.GetLeaseByID(r.Context(), leaseID)
	if err != nil {
		http.Error(w, "Lease not found", http.StatusNotFound)
		return
	}

	// Get preloaded lease template document ID from Documenso
	documentID := lease.ExternalDocID
	if documentID == "" {
		http.Error(w, "Lease document not linked to Documenso", http.StatusNotFound)
		return
	}

	// Define form values
	formValues := map[string]string{
		"tenant_name":      "John Doe",
		"property_address": "123 Main St",
		"lease_start_date": lease.LeaseStartDate.Time.Format("2006-01-02"),
		"lease_end_date":   lease.LeaseEndDate.Time.Format("2006-01-02"),
		"rent_amount":      lease.RentAmount.Int.String(),
	}

	// Iterate over form values and update fields in Documenso
	for field, value := range formValues {
		err := h.documenso_client.SetField(documentID, field, value)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to update field %s: %v", field, err), http.StatusInternalServerError)
			return
		}
	}

	// Return confirmation response
	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "Lease fields updated successfully in Documenso")
}

func (h *LeaseHandler) ValidateLeaseRequest(r *http.Request, landlordID int64) (*LeaseValidationResult, error) {
	var req LeaseWithSignersRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return nil, fmt.Errorf("invalid request format: %w", err)
	}

	if req.TenantName == "" || req.TenantEmail == "" {
		return nil, errors.New("tenant name and email are required")
	}

	if req.PropertyAddress == "" {
		return nil, errors.New("property address is required")
	}

	if req.RentAmount <= 0 {
		return nil, errors.New("valid rent amount is required")
	}

	if req.StartDate == "" || req.EndDate == "" {
		return nil, errors.New("lease start and end dates are required")
	}

	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		return nil, errors.New("invalid start date format. Use YYYY-MM-DD")
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		return nil, errors.New("invalid end date format. Use YYYY-MM-DD")
	}

	if endDate.Before(startDate) {
		return nil, errors.New("end date must be after start date")
	}

	if req.LandlordID == 0 {
		req.LandlordID = landlordID
	}

	return &LeaseValidationResult{
		StartDate: startDate,
		EndDate:   endDate,
		Validated: req,
	}, nil
}

// GenerateComprehensiveLeaseAgreement generates a full lease agreement PDF.
func (h *LeaseHandler) GenerateComprehensiveLeaseAgreement(title, landlordName, tenantName, propertyAddress string, rentAmount float64, startDate, endDate time.Time) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.AddPage()

	// Title
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(10, 10, title)
	pdf.Ln(15)

	// Agreement date
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(20, 10, fmt.Sprintf("This Lease Agreement is entered into on %s", time.Now().Format("January 2, 2006")))
	pdf.Ln(10)

	// Landlord section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "LANDLORD: ")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(80, 10, landlordName)
	pdf.Ln(15)

	// Tenant section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "TENANT")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(0, 10, tenantName)
	pdf.Ln(15)

	// Property section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "PROPERTY")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 12)
	pdf.MultiCell(0, 6, propertyAddress, "", "", false)
	pdf.Ln(15)

	// Lease term section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "LEASE TERM")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(40, 10, "Fixed Lease: From")
	pdf.Cell(60, 10, startDate.Format("January 2, 2006"))
	pdf.Cell(20, 10, "To")
	pdf.Cell(60, 10, endDate.Format("January 2, 2006"))
	pdf.Ln(25)

	// Rent section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "RENT")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(40, 10, fmt.Sprintf("Monthly Rent: $%.2f", rentAmount))
	pdf.Ln(10)

	// Basic terms section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "BASIC TERMS")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 10)
	pdf.MultiCell(0, 5, "1. Tenant shall maintain the Property in good condition.\n"+
		"2. Rent is due on the 1st of each month.\n"+
		"3. A security deposit equal to one month's rent is required.\n"+
		"4. Tenant shall not disturb neighbors.\n"+
		"5. Landlord may enter with 24 hours notice for inspections or repairs.", "", "", false)
	pdf.Ln(10)

	// Signatures section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "SIGNATURES")
	pdf.Ln(15)

	// Landlord signature
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(80, 10, "Landlord Signature:")
	pdf.Cell(80, 10, "Tenant Signature:")
	pdf.Ln(20)
	pdf.Ln(5)

	pdf.Cell(80, 10, "Date:")
	pdf.Cell(80, 10, "Date:")

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("failed to generate lease PDF: %w", err)
	}
	return buf.Bytes(), nil
}
func (h *LeaseHandler) setLeaseSignatureFields(docID string) error {
	// Add a delay to ensure document is fully processed
	time.Sleep(5 * time.Second)

	// Get the document to find recipients
	url := fmt.Sprintf("%s/documents/%s", h.documenso_client.BaseURL, docID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+h.documenso_client.ApiKey)

	resp, err := h.documenso_client.Client.Do(req)
	if err != nil {
		return fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	var docResponse struct {
		Recipients []struct {
			ID    int    `json:"id"`
			Email string `json:"email"`
			Name  string `json:"name"`
		} `json:"recipients"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&docResponse); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	log.Printf("Found %d recipients", len(docResponse.Recipients))

	// Find tenant and landlord recipients
	var tenantID, landlordID int
	for _, recipient := range docResponse.Recipients {
		log.Printf("Checking recipient: %s (%s)", recipient.Name, recipient.Email)
		if strings.Contains(strings.ToLower(recipient.Email), "wrldconnect1@gmail.com") {
			landlordID = recipient.ID
			log.Printf("Identified landlord recipient ID: %d", landlordID)
		} else {
			tenantID = recipient.ID
			log.Printf("Identified tenant recipient ID: %d", tenantID)
		}
	}

	// Use modified parameters for signature fields
	// For tenant (right side of document)
	if tenantID > 0 {
		// More conservative parameters - smaller field in a likely safe area
		if err := h.documenso_client.AddSignatureField(docID, tenantID, 48, 82, 30, 5); err != nil {
			log.Printf("Warning: Failed to add tenant signature: %v", err)
		}
	}

	// For landlord (left side of document)
	if landlordID > 0 {
		// More conservative parameters - smaller field in a likely safe area
		if err := h.documenso_client.AddSignatureField(docID, landlordID, 8, 82, 30, 5); err != nil {
			log.Printf("Warning: Failed to add landlord signature: %v", err)
		}
	}

	return nil
}

// Updated SavePDFToDisk function to create a full lease PDF
func SavePDFToDisk(pdfData []byte, title, tenantName string) error {
	// Sanitize tenant name for filename
	sanitizedTenantName := strings.ReplaceAll(tenantName, " ", "_")
	sanitizedTenantName = strings.ReplaceAll(sanitizedTenantName, "/", "_")

	// Generate unique filename
	timestamp := time.Now().Format("20060102-150405")
	filename := fmt.Sprintf("lease_%s_%s.pdf", timestamp, sanitizedTenantName)
	envDir := os.Getenv("TEMP_DIR")

	// Get environment variable if set
	if envDir == "" {
		envDir = "/app/temp"
	}

	// Create /app/temp directory to save pdfs

	if err := os.MkdirAll(envDir, 0755); err != nil {
		log.Printf("Could not create directory %s: %v", envDir, err)
	}

	filepath := filepath.Join(envDir, filename)
	err := os.WriteFile(filepath, pdfData, 0666)
	if err != nil {
		log.Printf("Could not save PDF to %s: %v", filepath, err)
	}

	log.Printf("✅ PDF successfully saved to: %s", filepath)
	return nil // Success

}

// Update the handleDocumensoUploadAndSetup function to call setLeaseSignatureFields
func (h *LeaseHandler) handleDocumensoUploadAndSetup(pdfData []byte, req LeaseWithSignersRequest, landlordName, landlordEmail string) (string, error) {
	// Prepare signers
	signers := []documenso.Signer{
		{
			Name:  req.TenantName,
			Email: req.TenantEmail,
			Role:  documenso.SignerRoleSigner,
		},
		{
			Name:  landlordName,
			Email: landlordEmail,
			Role:  documenso.SignerRoleSigner,
		},
	}

	// Set document title
	documentTitle := "Residential Lease Agreement"
	if req.DocumentTitle != "" {
		documentTitle = req.DocumentTitle
	}

	log.Println("Uploading lease to Documenso...")
	docID, _, err := h.documenso_client.UploadDocumentWithSigners(pdfData, documentTitle, signers)
	if err != nil {
		return "", fmt.Errorf("upload to Documenso failed: %w", err)
	}

	// Save PDF to disk in background
	go func() {
		if err := SavePDFToDisk(pdfData, documentTitle, req.TenantName); err != nil {
			log.Printf("Error saving PDF to disk: %v", err)
		}
	}()
	// Add a delay to allow Documenso to fully process the document
	time.Sleep(2 * time.Second)

	// Add only signature fields (not text fields)
	log.Println("Setting up signature fields...")
	if err := h.setLeaseSignatureFields(docID); err != nil {
		log.Printf("Warning: Failed to set up signature fields: %v", err)
		// Continue anyway since the document is uploaded
	}

	return docID, nil
}
func (h *LeaseHandler) RenewLease(w http.ResponseWriter, r *http.Request) {
	var req LeaseUpsertRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid renewal request", http.StatusBadRequest)
		return
	}

	// Set landlord ID if not provided
	if req.LandlordID == 0 {
		req.LandlordID = landlordID // Use the global landlord ID
	}

	log.Printf("[LEASE_RENEW] Renewing lease for tenant %d using previous lease ID %v", req.TenantID, req.PreviousLeaseID)
	if req.PreviousLeaseID == nil {
		http.Error(w, "Missing previous_lease_id for renewal", http.StatusBadRequest)
		return
	}

	req.LeaseNumber += 1 // Or increment based on lookup if needed

	req.ReplaceExisting = false
	req.CreatedBy = req.LandlordID
	req.UpdatedBy = req.LandlordID
	req.Status = "pending_tenant_approval"
	h.handleLeaseUpsert(w, r, req)
}

func (h *LeaseHandler) CreateLease(w http.ResponseWriter, r *http.Request) {
	var req LeaseUpsertRequest

	body, _ := io.ReadAll(r.Body)
	log.Printf("[LEASE_CREATE] Raw body: %s", body)

	if err := json.Unmarshal(body, &req); err != nil {
		log.Printf("[LEASE_CREATE] Failed to decode body: %v", err)
		http.Error(w, "Invalid lease request", http.StatusBadRequest)
		return
	}

	log.Printf("[LEASE_CREATE] Decoded request: %+v", req)

	// fill in defaults
	req.LeaseNumber = 1
	req.PreviousLeaseID = nil
	req.ReplaceExisting = false
	req.CreatedBy = req.LandlordID
	req.UpdatedBy = req.LandlordID
	req.Status = "pending_tenant_approval"

	h.handleLeaseUpsert(w, r, req)
}

// CreateFullLeaseAgreement generates a complete lease PDF, uploads it to Documenso,
// and fills out all the necessary fields - Keeping this for testing/quick lease generation
func (h *LeaseHandler) CreateFullLeaseAgreementRenewal(w http.ResponseWriter, r *http.Request) {
	var req LeaseWithSignersRequest

	// 1-3 inside HandleLeaseRequest: Parse and validate fields, and return response
	validationResult, err := h.ValidateLeaseRequest(r, landlordID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	req = validationResult.Validated
	startDate := validationResult.StartDate
	endDate := validationResult.EndDate

	// 4. Generate the full lease PDF
	pdfData, err := h.GenerateComprehensiveLeaseAgreement(
		req.DocumentTitle,
		landlordName,
		req.TenantName,
		req.PropertyAddress,
		req.RentAmount,
		startDate,
		endDate,
	)
	if err != nil {
		log.Printf("Error generating lease PDF: %v", err)
		http.Error(w, "Failed to generate lease PDF", http.StatusInternalServerError)
		return
	}
	//5-8. inside handleDocumensoUploadAndSetup: Prepare, upload, set lease fields in documenso and save PDF to disk.
	docID, err := h.handleDocumensoUploadAndSetup(
		pdfData,
		req,
		landlordName,
		landlordEmail,
	)
	if err != nil {
		log.Printf("Documenso processing error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 9. Create the lease record in the database
	leaseParams := db.RenewLeaseParams{
		LeaseNumber:    1,
		ExternalDocID:  docID,
		TenantID:       req.TenantID,
		LandlordID:     landlordID, // TODO: This should be dependent on clerk_id
		ApartmentID:    req.ApartmentID,
		LeaseStartDate: pgtype.Date{Time: startDate, Valid: true},
		LeaseEndDate:   pgtype.Date{Time: endDate, Valid: true},
		RentAmount:     pgtype.Numeric{Int: big.NewInt(int64(req.RentAmount * 100)), Exp: -2, Valid: true},
		Status:         db.LeaseStatus("pending_tenant_approval"),
		LeasePdf:       pdfData,
		CreatedBy:      landlordID, // Use landlord ID from database
		UpdatedBy:      landlordID, // TODO: This is correct here.
		//TODO: take previous id ptr and place here.
	}

	leaseID, err := h.queries.RenewLease(r.Context(), db.RenewLeaseParams{
		LeaseNumber:    leaseParams.LeaseNumber,
		ExternalDocID:  leaseParams.ExternalDocID,
		TenantID:       leaseParams.TenantID,
		LandlordID:     leaseParams.LandlordID,
		ApartmentID:    leaseParams.ApartmentID,
		LeaseStartDate: leaseParams.LeaseStartDate,
		LeaseEndDate:   leaseParams.LeaseEndDate,
		RentAmount:     leaseParams.RentAmount,
		Status:         leaseParams.Status,
		LeasePdf:       leaseParams.LeasePdf,
		CreatedBy:      leaseParams.CreatedBy,
		UpdatedBy:      leaseParams.UpdatedBy,
	})
	if err != nil {
		log.Printf("Error renewing lease in database: %v", err)
		http.Error(w, "Failed to renew lease in database", http.StatusInternalServerError)

		return
	}

	// 10. Return success response with lease details
	resp := map[string]interface{}{
		"lease_id":        leaseID,
		"external_doc_id": docID,
		"lease_sign_url":  h.documenso_client.GetSigningURL(docID),
		"tenant_name":     req.TenantName,
		"tenant_email":    req.TenantEmail,
		"status":          "pending_tenant_approval",
		"message":         "Lease agreement created successfully and sent for signing",
	}

	w.Header().Set("Content-Type", "application/json")

	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		log.Printf("Error encoding response: %v", err)
		return
	}
}

func (h *LeaseHandler) DocumensoWebhookHandler(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		DocumentID string `json:"document_id"`
		EventType  string `json:"event_type"`
		Signer     struct {
			Email string `json:"email"`
			Name  string `json:"name"`
			Role  string `json:"role"`
		} `json:"signer"`
	}

	// Parse the webhook payload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid webhook payload", http.StatusBadRequest)
		return
	}

	// Log the webhook event
	log.Printf("Received Documenso webhook: %s for document %s from %s (%s)",
		payload.EventType, payload.DocumentID, payload.Signer.Name, payload.Signer.Email)

	// Find leases by external document ID
	leases, err := h.queries.ListLeases(r.Context())
	if err != nil {
		log.Printf("Error listing leases: %v", err)
		http.Error(w, "Failed to list leases", http.StatusInternalServerError)
		return
	}

	// Find the lease with matching external doc ID
	var targetLease *db.Lease
	for _, lease := range leases {
		if lease.ExternalDocID == payload.DocumentID {
			targetLease = &db.Lease{
				ID:             lease.ID,
				ExternalDocID:  lease.ExternalDocID,
				TenantID:       lease.TenantID,
				LandlordID:     lease.LandlordID,
				ApartmentID:    lease.ApartmentID,
				LeaseStartDate: lease.LeaseStartDate,
				LeaseEndDate:   lease.LeaseEndDate,
				RentAmount:     lease.RentAmount,
				Status:         lease.Status,
				LeasePdf:       lease.LeasePdf,
				CreatedBy:      lease.CreatedBy,
				UpdatedBy:      lease.UpdatedBy,
			}

			break
		}
	}

	if targetLease == nil {
		log.Printf("No lease found with external doc ID %s", payload.DocumentID)
		http.Error(w, "Lease not found", http.StatusNotFound)
		return
	}

	// Handle different event types
	switch payload.EventType {
	case "document.opened":
		// Document has been opened by a recipient
		log.Printf("Document %s opened by %s", payload.DocumentID, payload.Signer.Email)

	case "document.signed":
		// Document has been signed by someone
		isLandlord := strings.Contains(strings.ToLower(payload.Signer.Email), "rentdaddy") ||
			strings.Contains(strings.ToLower(payload.Signer.Email), "admin@")

		if isLandlord {
			// Landlord has signed
			log.Printf("Lease %d signed by landlord %s", targetLease.ID, payload.Signer.Name)
		} else {
			// If it's the tenant signing, mark the lease as signed
			if err := h.queries.MarkLeaseAsSignedBothParties(r.Context(), targetLease.ID); err != nil {
				log.Printf("Error marking lease %d as signed: %v", targetLease.ID, err)
				http.Error(w, "Failed to update lease status", http.StatusInternalServerError)
				return
			}
			isLandlord := strings.Contains(strings.ToLower(payload.Signer.Email), "rentdaddy") ||
				strings.Contains(strings.ToLower(payload.Signer.Email), "admin@")

			if isLandlord {
				// Landlord has signed
				log.Printf("Lease %d signed by landlord %s", targetLease.ID, payload.Signer.Name)
			} else {
				// If it's the tenant signing, mark the lease as signed
				err := h.queries.MarkLeaseAsSignedBothParties(r.Context(), targetLease.ID)
				if err != nil {
					log.Printf("Error marking lease %d as signed: %v", targetLease.ID, err)
					http.Error(w, "Failed to update lease status", http.StatusInternalServerError)
					return
				}
				log.Printf("Lease %d marked as signed by tenant %s", targetLease.ID, payload.Signer.Name)
			}
		}
	case "document.completed":
		// All required signatures have been collected
		// Update lease status to active
		params := db.UpdateLeaseParams{
			ID:             targetLease.ID,
			TenantID:       targetLease.TenantID,
			Status:         db.LeaseStatus("active"),
			LeaseStartDate: targetLease.LeaseStartDate,
			LeaseEndDate:   targetLease.LeaseEndDate,
			RentAmount:     targetLease.RentAmount,
			UpdatedBy:      targetLease.LandlordID, // Using landlord ID for the update
		}
		err := h.queries.UpdateLease(r.Context(), params)
		if err != nil {
			log.Printf("Error updating lease %d status to active: %v", targetLease.ID, err)
			http.Error(w, "Failed to update lease status", http.StatusInternalServerError)
			return
		}
		log.Printf("Lease %d marked as active after all signatures received", targetLease.ID)

		// Download the fully signed document and save it
		signedDocData, err := h.documenso_client.DownloadDocument(payload.DocumentID)
		if err != nil {
			log.Printf("Warning: Could not download signed document: %v", err)
		} else {
			// Update the lease with the signed PDF
			err := h.queries.UpdateLeasePDF(r.Context(), db.UpdateLeasePDFParams{
				ID:        targetLease.ID,
				LeasePdf:  signedDocData,
				UpdatedBy: targetLease.LandlordID,
			})

			if err != nil {
				log.Printf("Warning: Failed to save signed PDF: %v", err)
			} else {
				log.Printf("Successfully saved signed PDF for lease %d", targetLease.ID)
			}
		}
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "Webhook processed successfully")
}

// NotifyExpiringLeases sends notifications about leases that are expiring soon
// without changing their statuses in the database
func (h *LeaseHandler) NotifyExpiringLeases(w http.ResponseWriter, r *http.Request) {
	log.Println("[LEASE_NOTIFY] Checking for leases expiring soon")

	// Get all leases instead of just active ones
	// This avoids the parameter issue and gives you a collection to iterate over
	leases, err := h.queries.ListLeases(r.Context())
	if err != nil {
		log.Printf("[LEASE_NOTIFY] Failed to retrieve leases: %v", err)
		http.Error(w, "Failed to retrieve leases", http.StatusInternalServerError)
		return
	}

	// Current date
	today := time.Now()
	expiringLeases := []map[string]interface{}{}

	// Check each lease for expiration within 60 days
	for _, lease := range leases {
		// Only process active leases
		if string(lease.Status) != "active" {
			continue
		}

		daysUntilExpiration := lease.LeaseEndDate.Time.Sub(today).Hours() / 24

		// If lease expires within 60 days but is still active
		if daysUntilExpiration <= 60 && daysUntilExpiration > 0 {
			// Get tenant name
			tenant, err := h.queries.GetUserByID(r.Context(), lease.TenantID)
			if err != nil {
				log.Printf("[LEASE_NOTIFY] Warning: Could not fetch tenant name for ID %d: %v", lease.TenantID, err)
				continue
			}

			// Get apartment details
			apartment, err := h.queries.GetApartment(r.Context(), lease.ApartmentID)
			if err != nil {
				log.Printf("[LEASE_NOTIFY] Warning: Could not fetch apartment for ID %d: %v", lease.ApartmentID, err)
				continue
			}

			// Format lease info for notification
			expiringLeases = append(expiringLeases, map[string]interface{}{
				"lease_id":        lease.ID,
				"tenant_name":     tenant.FirstName + " " + tenant.LastName,
				"tenant_email":    tenant.Email,
				"apartment":       apartment.UnitNumber,
				"days_remaining":  int(daysUntilExpiration),
				"expiration_date": lease.LeaseEndDate.Time.Format("2006-01-02"),
			})
		}
	}

	// Send notification emails if leases are expiring soon
	if len(expiringLeases) > 0 {
		// Send email to administrator
		err = sendExpiringLeasesNotification(expiringLeases)
		if err != nil {
			log.Printf("[LEASE_NOTIFY] Failed to send notification email: %v", err)
		}
	}

	// Return response with count of expiring leases
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"expiring_leases_count": len(expiringLeases),
		"expiring_leases":       expiringLeases,
		"message":               "Expiring lease notification check completed",
	}); err != nil {
		log.Printf("[LEASE_NOTIFY] Error encoding response: %v", err)
	}
}

// Helper function to send email notifications about expiring leases
func sendExpiringLeasesNotification(expiringLeases []map[string]interface{}) error {
	// Get admin email from environment or use default
	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = landlordEmail // Fallback to global landlord email
	}

	// Build email subject and body
	subject := fmt.Sprintf("ALERT: %d Leases Expiring Soon", len(expiringLeases))

	var body strings.Builder
	body.WriteString("The following leases are expiring soon and may need attention:\n\n")

	for _, lease := range expiringLeases {
		body.WriteString(fmt.Sprintf("- Lease ID: %v\n", lease["lease_id"]))
		body.WriteString(fmt.Sprintf("  Tenant: %v\n", lease["tenant_name"]))
		body.WriteString(fmt.Sprintf("  Apartment: %v\n", lease["apartment"]))
		body.WriteString(fmt.Sprintf("  Expiration Date: %v\n", lease["expiration_date"]))
		body.WriteString(fmt.Sprintf("  Days Remaining: %v\n\n", lease["days_remaining"]))
	}

	body.WriteString("\nPlease log in to the management system to initiate lease renewals for these tenants.\n")

	// Send the email
	return smtp.SendEmail(adminEmail, subject, body.String())
}
