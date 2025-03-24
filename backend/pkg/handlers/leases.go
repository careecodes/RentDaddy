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
	"net/url"
	"os"

	"strconv"
	"strings"

	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jung-kurt/gofpdf"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/internal/smtp"
	"github.com/careecodes/RentDaddy/middleware"

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
// var landlordID = int64(100)
// var landlordName = "First Landlord"
// var landlordEmail = "wrldconnect1@gmail.com"

// Temp dir for storing generated leases
var tempDir = os.Getenv("TEMP_DIR")

// LeaseHandler encapsulates dependencies for lease-related handlers
type LeaseHandler struct {
	pool             *pgxpool.Pool
	queries          *db.Queries
	documenso_client *documenso.DocumensoClient
	landlordID       int64
	landlordName     string
	landlordEmail    string
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
		UpdatedBy: h.landlordID,
		ID:        int64(leaseID),
	})
	if err != nil {
		log.Printf("[LEASE_TERMINATE] Failed to terminate lease %d: %v", leaseID, err)
		http.Error(w, "Could not terminate lease", http.StatusInternalServerError)
		return
	}

	log.Printf("[LEASE_TERMINATE] Lease %d manually terminated by admin %d", leaseID, h.landlordID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(map[string]interface{}{
		"message":                        "Lease terminated successfully",
		string(db.LeaseStatusTerminated): true,
		"lease_id":                       terminatedLease.ID,
		"status":                         terminatedLease.Status,
	}); err != nil {
		log.Printf("Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// NewLeaseHandler initializes a LeaseHandler
func NewLeaseHandler(pool *pgxpool.Pool, queries *db.Queries, r *http.Request) *LeaseHandler {
	baseURL := os.Getenv("DOCUMENSO_API_URL")
	apiKey := os.Getenv("DOCUMENSO_API_KEY")
	log.Printf("Documenso API URL: %s", baseURL)
	log.Printf("Documenso API Key: %s", apiKey)

	// Default fallback values
	currentLandlordID := int64(100) // Default to the original hardcoded value
	currentLandlordName := "First Landlord"
	currentLandlordEmail := "wrldconnect1@gmail.com"

	// Try to get user info from request if available
	if r != nil {
		currUserCtx, err := middleware.GetClerkUser(r)
		if err == nil {
			var adminMetadata struct {
				DbId  int64  `json:"db_id"`
				Email string `json:"email,omitempty"`
				Name  string `json:"name,omitempty"`
			}

			err = json.Unmarshal(currUserCtx.PublicMetadata, &adminMetadata)
			if err == nil && adminMetadata.DbId > 0 {
				currentLandlordID = adminMetadata.DbId

				// Update email and name if available
				if adminMetadata.Email != "" {
					currentLandlordEmail = adminMetadata.Email
				}
				if adminMetadata.Name != "" {
					currentLandlordName = adminMetadata.Name
				}

				log.Printf("[LEASE_HANDLER] Using landlord ID %d from user context", currentLandlordID)
			}
		} else {
			log.Printf("[LEASE_HANDLER] No user context available: %v", err)
		}
	}

	if tempDir == "" {
		tempDir = "/app/temp" // Default fallback
	}

	return &LeaseHandler{
		pool:             pool,
		queries:          queries,
		documenso_client: documenso.NewDocumensoClient(baseURL, apiKey),
		landlordID:       currentLandlordID,
		landlordName:     currentLandlordName,
		landlordEmail:    currentLandlordEmail,
	}
}

// Create Lease Response Struct
type CreateLeaseResponse struct {
	LeaseID         int64  `json:"lease_id"`
	ExternalDocID   string `json:"external_doc_id,omitempty"`
	Status          string `json:"lease_status"`
	LeasePDFS3      string `json:"lease_pdf_s3,omitempty"`
	LeaseSigningURL string `json:"lease_signing_url"`
}

type LeaseValidationResult struct {
	StartDate time.Time
	EndDate   time.Time
	Validated LeaseWithSignersRequest
}

type LeaseUpsertRequest struct {
	TenantID        int64   `json:"tenant_id"`
	LandlordID      int64   `json:"landlord_id,omitempty"` // Optional for admin, will be set by middleware
	ApartmentID     int64   `json:"apartment_id"`
	StartDate       string  `json:"start_date"`
	EndDate         string  `json:"end_date"`
	RentAmount      float64 `json:"rent_amount"`
	Status          string  `json:"lease_status"`
	ExternalDocID   string  `json:"external_doc_id,omitempty"`
	DocumentTitle   string  `json:"document_title"`
	CreatedBy       int64   `json:"created_by,omitempty"` // Will be set by middleware
	UpdatedBy       int64   `json:"updated_by,omitempty"` // Will be set by middleware
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
		req.LandlordID = h.landlordID // Use the global landlord ID
	}
	req.UpdatedBy = h.landlordID
	req.CreatedBy = h.landlordID

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
	// If a duplicate is found, provide a more detailed error
	if err == nil && existing.ID != 0 {
		if req.ReplaceExisting {
			// Terminate the existing lease instead of "archiving" it
			_, err = h.queries.TerminateLease(r.Context(), db.TerminateLeaseParams{
				UpdatedBy: req.CreatedBy,
				ID:        existing.ID,
			})

			if err != nil {
				log.Printf("[LEASE_UPSERT] Failed to terminate existing lease: %v", err)
				http.Error(w, "Failed to replace existing lease", http.StatusInternalServerError)
				return
			}
		} else {
			log.Printf("[LEASE_UPSERT] Duplicate lease exists for tenant %d, apartment %d with status %s",
				req.TenantID, req.ApartmentID, req.Status)
			http.Error(w, fmt.Sprintf("A lease already exists with ID: %d. Set replace_existing=true to override.", existing.ID), http.StatusConflict)
			return
		}
	}
	// Step 2: Generate the lease PDF
	pdfData, err := h.GenerateComprehensiveLeaseAgreement(
		req.DocumentTitle,
		h.landlordName, // TODO: Replace with actual landlord name lookup
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
	docID, _, tenantSigningURL, s3bucket, err := h.handleDocumensoUploadAndSetup(
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
		h.landlordName, // TODO: replace with Clerk user context
		h.landlordEmail,
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
		LeasePdfS3:      pgtype.Text{String: s3bucket, Valid: true},
		CreatedBy:       req.CreatedBy,
		UpdatedBy:       req.UpdatedBy,
		PreviousLeaseID: pgtype.Int8{Int64: derefOrZero(req.PreviousLeaseID), Valid: req.PreviousLeaseID != nil},
		TenantSigningUrl: pgtype.Text{
			String: tenantSigningURL,
			Valid:  tenantSigningURL != "",
		},
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

// Admin route for server.go
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
			log.Printf("Warning: Could not fetch apartment %d", lease.ApartmentID)
		}

		// IMPORTANT: Check specifically for terminated status first
		var status string
		if lease.Status == db.LeaseStatusTerminated {
			log.Printf("Preserving terminated status for lease ID %d", lease.ID)
			status = string(db.LeaseStatusTerminated)
		} else {
			// For non-terminated leases, use the helper method
			dbLease := db.Lease{
				ID:             lease.ID,
				Status:         lease.Status,
				LeaseStartDate: lease.LeaseStartDate,
				LeaseEndDate:   lease.LeaseEndDate,
			}
			status = h.GetLeaseStatus(dbLease)
		}

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

// GetLeaseStatus is a helper method that returns the current status of a lease
// This centralizes lease status calculation logic and can be used anywhere a status check is needed
func (h *LeaseHandler) GetLeaseStatus(lease db.Lease) string {
	// Special statuses that override date-based calculation
	if string(lease.Status) == string(db.LeaseStatusTerminated) ||
		string(lease.Status) == "draft" ||
		string(lease.Status) == string(db.LeaseStatusPendingApproval) {
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

	return string(db.LeaseStatusActive)
}

// UpdateAllLeaseStatuses handles updating expired lease statuses only
// This endpoint is designed to be called by a cron job
func (h *LeaseHandler) UpdateAllLeaseStatuses(w http.ResponseWriter, r *http.Request) {
	log.Println("[LEASE_STATUS_UPDATE] Starting daily lease status update")

	// Only expire leases that have ended today
	result, err := h.queries.ExpireLeasesEndingToday(r.Context())
	if err != nil {
		log.Printf("[LEASE_STATUS_UPDATE] Failed to expire leases: %v", err)
		http.Error(w, "Failed to expire leases", http.StatusInternalServerError)
		return
	}

	log.Printf("[LEASE_STATUS_UPDATE] %s", result.Message)

	// Return appropriate response based on the count
	if result.ExpiredCount == 0 {
		fmt.Fprintf(w, "No leases needed to be expired today")
	} else {
		fmt.Fprintf(w, "Successfully expired %d lease(s)", result.ExpiredCount)
	}
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

func (h *LeaseHandler) ValidateLeaseRequest(r *http.Request) (*LeaseValidationResult, error) {
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
		req.LandlordID = h.landlordID
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

	log.Printf("Inside GenerateComprehensiveLeaseAgreement for doc title %v", title)
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
	pdf.Ln(10)

	// Lease term section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "LEASE TERM")
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(40, 10, "Fixed Lease: From")
	pdf.Cell(60, 10, startDate.Format("January 2, 2006"))
	pdf.Cell(20, 10, "To")
	pdf.Cell(60, 10, endDate.Format("January 2, 2006"))
	pdf.Ln(10)

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

func (h *LeaseHandler) handleDocumensoUploadAndSetup(pdfData []byte, req LeaseWithSignersRequest, landlordName, landlordEmail string) (docID string,
	tenantRecipientID int,
	tenantSigningURL string, leasePdfS3 string,
	err error) {
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

	log.Printf("Uploading lease %v to Documenso...\n", documentTitle)
	docID, recipientInfoMap, s3bucket, err := h.documenso_client.UploadDocumentWithSigners(pdfData, documentTitle, signers)

	if err != nil {
		return "", 0, "", "", fmt.Errorf("upload to Documenso failed: %w", err)

	}

	// Save PDF to disk in background
	go func() {
		if err := SavePDFToDisk(pdfData, documentTitle, req.TenantName); err != nil {
			log.Printf("Error saving PDF to disk: %v", err)
		}
	}()

	// Add a longer delay to ensure document is fully processed
	time.Sleep(5 * time.Second)

	// Get valid recipient IDs directly from the document endpoint
	docURL := fmt.Sprintf("%s/documents/%s", h.documenso_client.BaseURL, docID)
	docReq, err := http.NewRequest("GET", docURL, nil)
	if err != nil {
		return docID, 0, "", "", nil // Return docID even if we can't add fields
	}
	docReq.Header.Set("Authorization", "Bearer "+h.documenso_client.ApiKey)

	docResp, err := h.documenso_client.Client.Do(docReq)
	if err != nil {
		log.Printf("Warning: Failed to get document details: %v", err)
		return docID, 0, "", "", nil
	}
	defer docResp.Body.Close()

	// Parse the document to get valid recipient IDs
	var docResponse struct {
		Recipients []struct {
			Id    int    `json:"id"`
			Email string `json:"email"`
		} `json:"recipients"`
	}

	if err := json.NewDecoder(docResp.Body).Decode(&docResponse); err != nil {
		log.Printf("Warning: Failed to parse document response: %v", err)
		return docID, 0, "", "", nil
	}

	// Map emails to recipient IDs
	validRecipientIDs := make(map[string]int)
	for _, r := range docResponse.Recipients {
		validRecipientIDs[r.Email] = r.Id
		log.Printf("Found valid recipient ID: %d for email: %s", r.Id, r.Email)
	}

	// Now add signature fields using valid recipient IDs
	tenantID, hasTenant := validRecipientIDs[req.TenantEmail]
	if hasTenant {
		if err := h.documenso_client.AddSignatureField(docID, tenantID, 47, 78, 35, 5); err != nil {
			log.Printf("Warning: Failed to add tenant signature: %v", err)
		} else {
			log.Printf("Successfully added signature field for tenant (ID: %d)", tenantID)
		}
	} else {
		log.Printf("Warning: Could not find valid tenant ID for email %s", req.TenantEmail)
	}
	if hasTenant {
		if err := h.documenso_client.AddSignatureField(docID, tenantID, 47, 88, 35, 5, "DATE"); err != nil {
			log.Printf("Warning: Failed to add tenant signature: %v", err)
		} else {
			log.Printf("Successfully added signature field for tenant (ID: %d)", tenantID)
		}
	} else {
		log.Printf("Warning: Could not find valid tenant ID for email %s", req.TenantEmail)
	}

	landlordID, hasLandlord := validRecipientIDs[landlordEmail]
	if hasLandlord {
		if err := h.documenso_client.AddSignatureField(docID, landlordID, 7, 78, 35, 5); err != nil {
			log.Printf("Warning: Failed to add landlord signature: %v", err)
		} else {
			log.Printf("Successfully added signature field for landlord (ID: %d)", landlordID)
		}
	} else {
		log.Printf("Warning: Could not find valid landlord ID for email %s", landlordEmail)
	}

	if hasLandlord {
		if err := h.documenso_client.AddSignatureField(docID, landlordID, 7, 88, 35, 5, "DATE"); err != nil {
			log.Printf("Warning: Failed to add landlord date field: %v", err)
		} else {
			log.Printf("Successfully added date field for landlord (ID: %d)", landlordID)
		}
	} else {
		log.Printf("Warning: Could not find valid landlord ID for email %s", landlordEmail)
	}

	return docID, tenantID, recipientInfoMap[req.TenantEmail].SigningURL, s3bucket, nil
}
func (h *LeaseHandler) RenewLease(w http.ResponseWriter, r *http.Request) {
	var req LeaseUpsertRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid renewal request", http.StatusBadRequest)
		return
	}

	// Set landlord ID if not provided
	if req.LandlordID == 0 {
		req.LandlordID = h.landlordID // Use the global landlord ID
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
	req.Status = string(db.LeaseStatusPendingApproval)
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

	// IMPORTANT: Always set status to "draft" for new leases, regardless of what was in the request
	req.Status = "draft"

	h.handleLeaseUpsert(w, r, req)

}

// CreateFullLeaseAgreement generates a complete lease PDF, uploads it to Documenso,
// and fills out all the necessary fields - Keeping this for testing/quick lease generation
func (h *LeaseHandler) CreateFullLeaseAgreementRenewal(w http.ResponseWriter, r *http.Request) {
	var req LeaseWithSignersRequest

	// 1-3 inside HandleLeaseRequest: Parse and validate fields, and return response
	validationResult, err := h.ValidateLeaseRequest(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	req = validationResult.Validated
	startDate := validationResult.StartDate
	endDate := validationResult.EndDate

	// 4. Generate the full lease PDF
	pdfData, err := h.GenerateComprehensiveLeaseAgreement(
		req.DocumentTitle,
		h.landlordName,
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
	docID, _, tenantSigningURL, s3bucket, err := h.handleDocumensoUploadAndSetup(
		pdfData,
		req,
		h.landlordName,
		h.landlordEmail,
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
		LandlordID:     h.landlordID, // TODO: This should be dependent on clerk_id
		ApartmentID:    req.ApartmentID,
		LeaseStartDate: pgtype.Date{Time: startDate, Valid: true},
		LeaseEndDate:   pgtype.Date{Time: endDate, Valid: true},
		RentAmount:     pgtype.Numeric{Int: big.NewInt(int64(req.RentAmount * 100)), Exp: -2, Valid: true},
		Status:         db.LeaseStatus(db.LeaseStatusPendingApproval),
		LeasePdfS3:     pgtype.Text{String: s3bucket, Valid: true},
		CreatedBy:      h.landlordID, // Use landlord ID from database
		UpdatedBy:      h.landlordID,
		TenantSigningUrl: pgtype.Text{
			String: tenantSigningURL,
			Valid:  tenantSigningURL != "",
		},
	}

	leaseID, err := h.queries.RenewLease(r.Context(), db.RenewLeaseParams{
		LeaseNumber:      leaseParams.LeaseNumber,
		ExternalDocID:    leaseParams.ExternalDocID,
		TenantID:         leaseParams.TenantID,
		LandlordID:       leaseParams.LandlordID,
		ApartmentID:      leaseParams.ApartmentID,
		LeaseStartDate:   leaseParams.LeaseStartDate,
		LeaseEndDate:     leaseParams.LeaseEndDate,
		RentAmount:       leaseParams.RentAmount,
		Status:           leaseParams.Status,
		LeasePdfS3:       leaseParams.LeasePdfS3,
		CreatedBy:        leaseParams.CreatedBy,
		UpdatedBy:        leaseParams.UpdatedBy,
		TenantSigningUrl: leaseParams.TenantSigningUrl,
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
		"status":          db.LeaseStatusPendingApproval,
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
		if string(lease.Status) != string(db.LeaseStatusActive) {
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
		err = h.sendExpiringLeasesNotification(expiringLeases)
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
func (h *LeaseHandler) sendExpiringLeasesNotification(expiringLeases []map[string]interface{}) error {
	// Get admin email from environment or use default
	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = h.landlordEmail // Fallback to global landlord email
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

// DocumensoGetDocumentURL retrieves the document signing URL from Documenso
func (h *LeaseHandler) DocumensoGetDocumentURL(w http.ResponseWriter, r *http.Request) {
	// Get lease ID from URL parameter
	leaseIDStr := chi.URLParam(r, "leaseID")
	if leaseIDStr == "" {
		http.Error(w, "Missing lease ID in URL", http.StatusBadRequest)
		return
	}

	leaseID, err := strconv.ParseInt(leaseIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid lease ID format", http.StatusBadRequest)
		return
	}

	// Get lease details from database
	lease, err := h.queries.GetLeaseByID(r.Context(), leaseID)
	if err != nil {
		log.Printf("[DOCUMENSO_URL] Error fetching lease %d: %v", leaseID, err)
		http.Error(w, "Lease not found", http.StatusNotFound)
		return
	}

	// Check if lease has a Documenso document ID
	if lease.ExternalDocID == "" {
		http.Error(w, "Lease has no associated Documenso document", http.StatusNotFound)
		return
	}

	// Get the document download URL from Documenso
	downloadURL, err := h.documenso_client.GetDocumentDownloadURL(lease.ExternalDocID)
	unescapedURL := downloadURL
	decodedURL, decodeErr := url.QueryUnescape(downloadURL)
	if decodeErr != nil {
		log.Printf("[WEBHOOK] Failed to unescape URL: %v", decodeErr)
	} else {
		unescapedURL = decodedURL
	}
	if err != nil {
		log.Printf("[DOCUMENSO_URL] Failed to get document URL: %v", err)
		http.Error(w, "Failed to retrieve document URL: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return the URL to the client
	response := map[string]interface{}{
		"lease_id":        leaseID,
		"external_doc_id": lease.ExternalDocID,
		"download_url":    unescapedURL,
		"status":          lease.Status,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[DOCUMENSO_URL] Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// PdfS3GetDocumentURL retrieves the stored S3 URL for a lease PDF
func (h *LeaseHandler) PdfS3GetDocumentURL(w http.ResponseWriter, r *http.Request) {
	// Get lease ID from URL parameter
	leaseIDStr := chi.URLParam(r, "leaseID")
	if leaseIDStr == "" {
		http.Error(w, "Missing lease ID in URL", http.StatusBadRequest)
		return
	}

	leaseID, err := strconv.ParseInt(leaseIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid lease ID format", http.StatusBadRequest)
		return
	}

	// Get lease details from database
	lease, err := h.queries.GetLeaseByID(r.Context(), leaseID)
	if err != nil {
		log.Printf("[PDF_S3_URL] Error fetching lease %d: %v", leaseID, err)
		http.Error(w, "Lease not found", http.StatusNotFound)
		return
	}

	// Check if lease has an S3 URL
	if !lease.LeasePdfS3.Valid || lease.LeasePdfS3.String == "" {
		http.Error(w, "Lease has no associated PDF URL", http.StatusNotFound)
		return
	}

	// Return the S3 URL to the client
	response := map[string]interface{}{
		"lease_id":     leaseID,
		"lease_pdf_s3": lease.LeasePdfS3.String,
		"status":       lease.Status,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[PDF_S3_URL] Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
func (h *LeaseHandler) DocumensoWebhookHandler(w http.ResponseWriter, r *http.Request) {

	// Read the request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[WEBHOOK] Error reading request body: %v", err)
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	// Parse the JSON payload
	var webhookData map[string]interface{}
	if err := json.Unmarshal(body, &webhookData); err != nil {
		log.Printf("[WEBHOOK] Error parsing webhook JSON: %v", err)
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}
	// Read the webhook secret from environment variable
	webhookSecret := os.Getenv("DOCUMENSO_WEBHOOK_SECRET")
	if webhookSecret == "" {
		log.Printf("[WEBHOOK] Warning: DOCUMENSO_WEBHOOK_SECRET not set")
	}

	// Read the signature from the header
	receivedSignature := r.Header.Get("X-Documenso-Secret")

	// Only verify signature if we have a secret configured
	if webhookSecret != "" && receivedSignature != "" {
		// Compare with the provided signature
		if webhookSecret != receivedSignature {
			log.Printf("[WEBHOOK] Invalid signature. Expected: %s, Received: %s", webhookSecret, receivedSignature)
			http.Error(w, "Invalid signature", http.StatusUnauthorized)
			return
		}
		log.Printf("[WEBHOOK] Signature validation successful")
	}
	// Extract the event type
	eventType, ok := webhookData["event"].(string)
	if !ok {
		log.Printf("[WEBHOOK] Missing event type in webhook payload")
		http.Error(w, "Invalid webhook format", http.StatusBadRequest)
		return
	}

	log.Printf("[WEBHOOK] Received Documenso webhook event: %s", eventType)

	// We only care about DOCUMENT_COMPLETED events
	if eventType != "DOCUMENT_COMPLETED" {
		log.Printf("[WEBHOOK] Ignoring non-completion event: %s", eventType)
		w.WriteHeader(http.StatusOK)
		if _, err := w.Write([]byte(`{"status":"acknowledged"}`)); err != nil {
			log.Printf("Error writing response: %v", err)
		}
		return
	}

	// Extract document ID from the payload
	payload, ok := webhookData["payload"].(map[string]interface{})
	if !ok {
		log.Printf("[WEBHOOK] Missing payload data in webhook")
		http.Error(w, "Invalid webhook format", http.StatusBadRequest)
		return
	}

	// First try to get externalId, then fall back to id if needed
	var documentID string
	if extID, ok := payload["externalId"].(string); ok && extID != "" {
		documentID = extID
	} else if idValue, ok := payload["id"].(float64); ok {
		documentID = strconv.FormatFloat(idValue, 'f', 0, 64)
	} else {
		log.Printf("[WEBHOOK] Missing document identifier in webhook payload")
		http.Error(w, "Invalid webhook format", http.StatusBadRequest)
		return
	}

	// Acknowledge receipt of the webhook immediately
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write([]byte(`{"status":"processing"}`)); err != nil {
		log.Printf("Error writing response: %v", err)
	}

	// Process the webhook asynchronously
	go func() {
		ctx := r.Context()

		// 1. Get the lease associated with this document ID
		lease, err := h.queries.GetLeaseByExternalDocID(ctx, documentID)
		if err != nil {
			log.Printf("[WEBHOOK] No lease found for doc ID %s: %v", documentID, err)
			return
		}

		log.Printf("[WEBHOOK] Document %s signed, marking lease %d as active", documentID, lease.ID)

		// 2. Update the lease status to active
		updatedLease, err := h.queries.UpdateLeaseStatus(ctx, db.UpdateLeaseStatusParams{
			ID:        lease.ID,
			Status:    db.LeaseStatusActive,
			UpdatedBy: h.landlordID,
		})

		if err != nil {
			log.Printf("[WEBHOOK] Failed to update lease status: %v", err)
			return
		}

		log.Printf("[WEBHOOK] Lease %d marked as active", updatedLease.ID)

		// 3. Check if there's an apartment associated with this lease
		if updatedLease.ApartmentID != 0 {
			// Get the current apartment info
			apartment, err := h.queries.GetApartment(ctx, updatedLease.ApartmentID)
			if err != nil {
				log.Printf("[WEBHOOK] Failed to get apartment with ID %d: %v", updatedLease.ApartmentID, err)
				return
			}

			// Update the apartment to unavailable
			// Based on your errors, pgtype.Int8 is expected, not sql.NullInt64
			leaseID := pgtype.Int8{
				Int64: updatedLease.ID,
				Valid: true,
			}

			err = h.queries.UpdateApartment(ctx, db.UpdateApartmentParams{
				ID:           apartment.ID,
				Price:        apartment.Price,
				ManagementID: apartment.ManagementID,
				Availability: false,
				LeaseID:      leaseID,
			})

			if err != nil {
				log.Printf("[WEBHOOK] Failed to update apartment availability: %v", err)
				return
			}

			log.Printf("[WEBHOOK] Updated apartment ID %d to unavailable", apartment.ID)
		}

		// 4. Download the signed document from Documenso if needed
		downloadURL, err := h.documenso_client.GetDocumentDownloadURL(documentID)
		if err == nil {
			unescapedURL := downloadURL
			decodedURL, decodeErr := url.QueryUnescape(downloadURL)
			if decodeErr == nil {
				unescapedURL = decodedURL
			}
			log.Printf("[WEBHOOK] Document download URL: %s", downloadURL)
			// Update the lease record with the signed document URL
			err = h.queries.UpdateSignedLeasePdfS3URL(ctx, db.UpdateSignedLeasePdfS3URLParams{
				ID:         updatedLease.ID,
				LeasePdfS3: pgtype.Text{String: unescapedURL, Valid: true},
			})

			if err != nil {
				log.Printf("[WEBHOOK] Failed to update signed document URL: %v", err)
			} else {
				log.Printf("[WEBHOOK] Updated lease %d with signed document URL %v", updatedLease.ID, unescapedURL)
			}
		}
	}()
}

// SendLease updates a lease from draft to pending_approval state
// and triggers the documenso sending process
func (h *LeaseHandler) SendLease(w http.ResponseWriter, r *http.Request) {
	// Get lease ID from URL parameter
	leaseIDStr := chi.URLParam(r, "leaseID")
	if leaseIDStr == "" {
		http.Error(w, "Missing lease ID in URL", http.StatusBadRequest)
		return
	}

	leaseID, err := strconv.ParseInt(leaseIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid lease ID format", http.StatusBadRequest)
		return
	}

	log.Printf("[LEASE_SEND] Sending lease ID %d for signing", leaseID)

	// First, get the current lease
	lease, err := h.queries.GetLeaseByID(r.Context(), leaseID)
	if err != nil {
		log.Printf("[LEASE_SEND] Error fetching lease %d: %v", leaseID, err)
		http.Error(w, "Lease not found", http.StatusNotFound)
		return
	}

	// Verify lease is in draft or pending_approval status
	if string(lease.Status) != "draft" && string(lease.Status) != string(db.LeaseStatusPendingApproval) {
		log.Printf("[LEASE_SEND] Cannot send lease %d with status %s", leaseID, lease.Status)
		http.Error(w, "Only leases in draft or pending approval status can be sent", http.StatusBadRequest)
		return
	}

	// Get tenant info
	tenant, err := h.queries.GetUserByID(r.Context(), lease.TenantID)
	if err != nil {
		log.Printf("[LEASE_SEND] Failed to get tenant info: %v", err)
		http.Error(w, "Tenant not found", http.StatusInternalServerError)
		return
	}

	// Fetch latest tenant signing URL from Documenso
	tenantSigningURL, urlErr := h.documenso_client.GetTenantSigningURL(lease.ExternalDocID, tenant.Email)
	if urlErr != nil {
		log.Printf("[LEASE_SEND] Failed to get tenant signing URL: %v", urlErr)
		http.Error(w, "Failed to fetch signing URL", http.StatusInternalServerError)
		return
	}

	// Persist the signing URL in the database
	err = h.queries.UpdateTenantSigningURL(r.Context(), db.UpdateTenantSigningURLParams{
		ID:               leaseID,
		TenantSigningUrl: pgtype.Text{String: tenantSigningURL, Valid: true},
	})
	if err != nil {
		log.Printf("[LEASE_SEND] Failed to persist signing URL: %v", err)
		// Continue anyway; not fatal to sending
	}

	// Update lease status to pending_approval
	updateParams := db.UpdateLeaseStatusParams{
		ID:        leaseID,
		Status:    db.LeaseStatus(db.LeaseStatusPendingApproval),
		UpdatedBy: h.landlordID, // TODO: Make sure h.landlordID is set correctly here
	}

	updatedLease, err := h.queries.UpdateLeaseStatus(r.Context(), updateParams)
	if err != nil {
		log.Printf("[LEASE_SEND] Failed to update lease status: %v", err)
		http.Error(w, "Failed to update lease status", http.StatusInternalServerError)
		return
	}

	// Return success
	resp := map[string]interface{}{
		"lease_id":        leaseID,
		"status":          db.LeaseStatusPendingApproval,
		"sign_url":        tenantSigningURL,
		"external_doc_id": updatedLease.ExternalDocID,
		"message":         "Lease has been sent for signing",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("[LEASE_SEND] Error encoding response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}

// deprecated to combine URL with status in GetTenantLeaseStatusAndURLByUserID
func (h *LeaseHandler) GetTenantSigningURL(w http.ResponseWriter, r *http.Request) {

	// needs to get user id --> lookup largest-numbered lease for that user.
	userIdStr := chi.URLParam(r, "user_id")
	tenantEmail := r.URL.Query().Get("email")

	if userIdStr == "" || tenantEmail == "" {
		http.Error(w, "Missing userID or email", http.StatusBadRequest)
		return
	}

	userId, err := strconv.ParseInt(userIdStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid userID", http.StatusBadRequest)
		return
	}

	lease, err := h.queries.GetLeaseByID(r.Context(), userId)
	if err != nil {
		http.Error(w, "Lease not found", http.StatusNotFound)
		return
	}

	signingURL, err := h.documenso_client.GetTenantSigningURL(lease.ExternalDocID, tenantEmail)
	if err != nil {
		http.Error(w, "Failed to retrieve signing URL: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(w).Encode(map[string]string{
		"email":       tenantEmail,
		"signing_url": signingURL,
	}); err != nil {
		http.Error(w, "Failed to encode response: "+err.Error(), http.StatusInternalServerError)
		log.Printf("Error encoding response: %v", err)
		return
	}
}

func (h *LeaseHandler) GetSignedLeaseURL(w http.ResponseWriter, r *http.Request) {
	leaseIDStr := chi.URLParam(r, "leaseID")
	if leaseIDStr == "" {
		http.Error(w, "Missing leaseID", http.StatusBadRequest)
		return
	}

	leaseID, err := strconv.ParseInt(leaseIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid leaseID", http.StatusBadRequest)
		return
	}

	lease, err := h.queries.GetLeaseByID(r.Context(), leaseID)
	if err != nil {
		http.Error(w, "Lease not found", http.StatusNotFound)
		return
	}

	var pdfURL string
	status := string(lease.Status)
	isSignedStatus := status == string(db.LeaseStatusActive) || status == string(db.LeaseStatusExpired) || status == string(db.LeaseStatusTerminated)

	// If the lease has a PDF URL stored, use it
	if lease.LeasePdfS3.Valid && lease.LeasePdfS3.String != "" {
		pdfURL = lease.LeasePdfS3.String
		log.Printf("[LEASE_URL] Using stored PDF URL for lease %d with status %s", leaseID, status)
	} else if lease.ExternalDocID != "" && isSignedStatus {
		// Only try to get the signed version if the lease status indicates it's been signed

		downloadURL, err := h.documenso_client.GetDocumentDownloadURL(lease.ExternalDocID)
		if err == nil {
			unescapedURL := downloadURL
			decodedURL, decodeErr := url.QueryUnescape(downloadURL)
			if decodeErr != nil {
				log.Printf("[LEASE_URL] Failed to unescape URL: %v", decodeErr)
			} else {
				unescapedURL = decodedURL
			}
			pdfURL = unescapedURL
			log.Printf("[LEASE_URL] Retrieved signed document URL from Documenso for lease %d", leaseID)

			// Update the database with this URL for future use
			err = h.queries.UpdateSignedLeasePdfS3URL(r.Context(), db.UpdateSignedLeasePdfS3URLParams{
				ID:         leaseID,
				LeasePdfS3: pgtype.Text{String: unescapedURL, Valid: true},
			})
			if err != nil {
				log.Printf("[LEASE_URL] Failed to update document URL: %v", err)
			}
		} else {
			log.Printf("[LEASE_URL] Failed to get download URL from Documenso: %v", err)
		}
	}

	if pdfURL == "" {
		http.Error(w, "No PDF URL available for this lease", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{
		"lease_pdf_s3": pdfURL,
		"lease_status": status,
	}); err != nil {
		http.Error(w, "Failed to encode response: "+err.Error(), http.StatusInternalServerError)
		log.Printf("Error encoding response: %v", err)
		return
	}
}

func (h *LeaseHandler) GetTenantLeaseStatusAndURLByUserID(w http.ResponseWriter, r *http.Request) {

	// needs to get user id --> lookup largest-numbered lease for that user.
	userIdStr := chi.URLParam(r, "user_id")

	if userIdStr == "" {
		http.Error(w, "Missing userID or email", http.StatusBadRequest)
		return
	}

	userId, err := strconv.ParseInt(userIdStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid userID", http.StatusBadRequest)
		return
	}

	lease, err := h.queries.GetTenantLeaseStatusAndURLByUserID(r.Context(), userId)
	if err != nil {
		http.Error(w, "Failed to retrieve signing URL: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := json.NewEncoder(w).Encode(map[string]string{
		"url":    lease.TenantSigningUrl.String,
		"status": string(lease.Status),
	}); err != nil {
		http.Error(w, "Failed to encode response: "+err.Error(), http.StatusInternalServerError)
		log.Printf("Error encoding response: %v", err)
		return
	}

}
