package handlers

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jung-kurt/gofpdf"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/middleware"
	"github.com/careecodes/RentDaddy/pkg/handlers/documenso"
)

/*

Lease Creation Summary:
1. Generate PDF template (don't store it - hardcode it) - (GeneratePDFHandler, GenerateLeaseTemplatePDF)
2. Have Admin fill details on frontend and call - (GenerateAndUploadLeasePDF)
3. Generate lease PDF from Documenso client and store direct link for signing - (GenerateAndUploadLeasePDF)
4. When lease is signed - flag it as signed - (DocumensoWebhookHandler)

Lease Signing Summary:

Lease Retrieval Summary:

Lease Termination Summary:

Lease Renewal Summary:

*/
// LeaseHandler encapsulates dependencies for lease-related handlers
type LeaseHandler struct {
	pool             *pgxpool.Pool
	queries          *db.Queries
	documenso_client *documenso.DocumensoClient
}

// NewLeaseHandler initializes a LeaseHandler
func NewLeaseHandler(pool *pgxpool.Pool, queries *db.Queries) *LeaseHandler {
	baseURL := os.Getenv("DOCUMENSO_API_URL")
	apiKey := os.Getenv("DOCUMENSO_API_KEY")
	return &LeaseHandler{
		pool:             pool,
		queries:          queries,
		documenso_client: documenso.NewDocumensoClient(baseURL, apiKey),
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
		ApartmentID:    r.ApartmentID,
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

// GenerateLeasePDF creates a hardcoded lease PDF
func (h LeaseHandler) GenerateLeaseTemplatePDF(title string, tenantName string, rentAmount float64, propertyAddress string) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Set margins
	pdf.SetMargins(20, 20, 20)
	pdf.SetX(20)
	pdf.SetY(20)

	// Title
	pdf.SetFont("Arial", "B", 16)
	pdf.Cell(0, 10, "Residential Lease Agreement")
	pdf.Ln(15)

	// Agreement date
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(0, 10, "This Lease Agreement is entered into on __________________________ between:")
	pdf.Ln(15)

	// Landlord section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "Landlord")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 12)
	pdf.Cell(0, 10, "___________________________________")
	pdf.Ln(15)

	// Tenant section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "Tenant")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 12)
	pdf.Cell(0, 10, "___________________________________")
	pdf.Ln(15)

	// Property section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "PROPERTY")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 12)
	pdf.Cell(0, 10, fmt.Sprintf("The rental property is located at: ________________________ Street in Dallas, Dallas, Texas 77777, USA"))
	pdf.Ln(25)

	// Lease term section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "LEASE TERM")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 12)
	pdf.Cell(40, 10, "Fixed Lease: From")
	pdf.Cell(60, 10, "__________________________ To")
	pdf.Cell(60, 10, "__________________________")
	pdf.Ln(25)

	// Rent section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "RENT")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 12)
	pdf.Cell(40, 10, "Monthly Rent:")
	pdf.Cell(20, 10, "$")
	pdf.Cell(60, 10, "________________________")
	pdf.Ln(10)

	pdf.Cell(0, 10, "Due on the 1st of each month.")
	pdf.Ln(15)

	// Security deposit section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "SECURITY DEPOSIT")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 12)
	pdf.Cell(40, 10, "Amount:")
	pdf.Cell(20, 10, "$")
	pdf.Cell(60, 10, "________________________")
	pdf.Ln(15)

	// Late rent section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "LATE RENT")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 12)
	pdf.Cell(0, 10, "If unpaid within 5 days, a late fee of 20% of rent applies.")
	pdf.Ln(25)

	// Signatures section
	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(40, 10, "SIGNATURES")
	pdf.Ln(10)

	pdf.SetFont("Arial", "", 12)
	pdf.Cell(0, 10, "Landlord Signature:")
	pdf.Ln(10)
	pdf.Cell(0, 10, "___________________________________")
	pdf.Ln(10)

	pdf.Cell(40, 10, "Date:")
	pdf.Ln(10)
	pdf.Cell(0, 10, "___________________________________")
	pdf.Ln(15)

	pdf.SetFont("Arial", "", 12)
	pdf.Cell(0, 10, "Tenant Signature:")
	pdf.Ln(10)
	pdf.Cell(0, 10, "___________________________________")
	pdf.Ln(10)

	pdf.Cell(40, 10, "Date:")
	pdf.Ln(10)
	pdf.Cell(0, 10, "___________________________________")
	pdf.Ln(10)

	// Page number
	pdf.Cell(0, 10, "1")

	var buf bytes.Buffer

	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate lease PDF: %w", err)
	}
	return buf.Bytes(), nil
}

// GetLeasePDF retrieves the generated lease PDF
func (h LeaseHandler) GetLeasePDF(w http.ResponseWriter, r *http.Request) {
	leaseIDStr := chi.URLParam(r, "leaseID")
	leaseID, err := strconv.ParseInt(leaseIDStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid lease ID", http.StatusBadRequest)
		return
	}

	lease, err := h.queries.GetLeaseByID(r.Context(), leaseID)
	if err != nil {
		http.Error(w, "Lease not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.WriteHeader(http.StatusOK)
	w.Write(lease.LeasePdf)
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
func (h LeaseHandler) GeneratePDFHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TenantName      string  `json:"tenant_name"`
		RentAmount      float64 `json:"rent_amount"`
		PropertyAddress string  `json:"property_address"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	leasePDF, err := h.GenerateLeaseTemplatePDF("Residential Lease", req.TenantName, req.RentAmount, req.PropertyAddress)
	if err != nil {
		http.Error(w, "Failed to generate lease PDF", http.StatusInternalServerError)
		return
	}

	// Send generated PDF to client
	w.Header().Set("Content-Type", "application/pdf")
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(leasePDF); err != nil {
		http.Error(w, "Failed to write lease PDF to response", http.StatusInternalServerError)
		return
	}

}

// // Discarding Lease Template functionality for now.
// func (h LeaseHandler) GetLeaseTemplateTitles(w http.ResponseWriter, r *http.Request) {
// 	log.Println("[DEBUG] GetLeaseTemplateTitles endpoint hit")
// 	ctx := context.Background()
// 	lease, err := h.queries.GetLeaseTemplateTitles(ctx)
// 	if err != nil {
// 		log.Printf("[ERROR] Failed to fetch templates: %v", err)
// 		http.Error(w, "Error fetching templates", http.StatusNotFound)
// 		return
// 	}
// 	log.Printf("[DEBUG] Found %d lease templates", len(lease))

//		w.Header().Set("Content-Type", "application/json")
//		if err := json.NewEncoder(w).Encode(lease); err != nil {
//			log.Printf("[ERROR] Failed to encode response: %v", err)
//			http.Error(w, "Error parsing database content", http.StatusInternalServerError)
//		}
//	}
func (h *LeaseHandler) GenerateAndUploadLeasePDF(w http.ResponseWriter, r *http.Request) {
	var req struct {
		TenantName      string  `json:"tenant_name"`
		PropertyAddress string  `json:"property_address"`
		RentAmount      float64 `json:"rent_amount"`
		LeaseTemplateID int64   `json:"lease_template_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	// Generate lease PDF
	leasePDF, err := h.GenerateLeaseTemplatePDF("Lease Agreement", req.TenantName, req.RentAmount, req.PropertyAddress)
	if err != nil {
		http.Error(w, "Failed to generate lease PDF", http.StatusInternalServerError)
		return
	}

	// Upload to Documenso

	docID, err := h.documenso_client.UploadDocument(leasePDF, "Lease Agreement")
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to upload lease PDF: %v", err), http.StatusInternalServerError)
		return
	}

	// Store lease
	leaseParams := db.CreateLeaseParams{
		TenantID:      req.LeaseTemplateID,
		ExternalDocID: docID,
		LeaseStatus:   db.LeaseStatus("Pending Signature"),
		RentAmount:    pgtype.Numeric{Int: big.NewInt(int64(req.RentAmount)), Exp: -2, Valid: true},
	}

	leaseID, err := h.queries.CreateLease(r.Context(), leaseParams)
	if err != nil {
		http.Error(w, "Failed to store lease in database", http.StatusInternalServerError)
		return
	}

	// Return signing link
	resp := map[string]string{
		"lease_id":       fmt.Sprintf("%d", leaseID),
		"lease_sign_url": fmt.Sprintf("https://documenso.com/sign/%s", docID),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
func (h LeaseHandler) DocumensoWebhookHandler(w http.ResponseWriter, r *http.Request) {
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
	log.Printf("Received Documenso webhook: %s for document %s", payload.EventType, payload.DocumentID)

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
			targetLease = &lease
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
	case "document.signed":
		// Document has been signed by someone
		if payload.Signer.Role == "SIGNER" {
			// If it's the tenant signing (SIGNER role), mark the lease as signed
			err := h.queries.MarkLeaseAsSigned(r.Context(), targetLease.ID)
			if err != nil {
				log.Printf("Error marking lease %d as signed: %v", targetLease.ID, err)
				http.Error(w, "Failed to update lease status", http.StatusInternalServerError)
				return
			}
			log.Printf("Lease %d marked as signed by tenant %s", targetLease.ID, payload.Signer.Name)
		}

	case "document.completed":
		// All required signatures have been collected
		// Update lease status to active
		params := db.UpdateLeaseParams{
			ID:             targetLease.ID,
			TenantID:       targetLease.TenantID,
			LeaseStatus:    db.LeaseStatus("active"),
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
	}

	w.WriteHeader(http.StatusOK)
	fmt.Fprintln(w, "Webhook processed successfully")
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

// UploadLeaseWithSigners handles lease generation with tenant and landlord signers
func (h *LeaseHandler) UploadLeaseWithSigners(w http.ResponseWriter, r *http.Request) {
	// 1. Parse request body
	var req LeaseWithSignersRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error parsing request: %v", err)
		http.Error(w, fmt.Sprintf("Invalid request format: %v", err), http.StatusBadRequest)
		return
	}

	// Set default document title if not provided
	if req.DocumentTitle == "" {
		req.DocumentTitle = "Residential Lease Agreement"
	}

	// 2. Get admin user ID using your existing middleware
	var adminID int64
	var adminEmail, adminName string

	// Use your existing middleware function to get the admin user
	clerkUser, err := middleware.GetClerkUser(r)
	if err != nil || clerkUser == nil {
		log.Printf("Warning: Failed to get authenticated user: %v", err)
		// For development purposes, use fallback admin
		if req.LandlordID > 0 {
			adminID = req.LandlordID
		} else {
			adminID = 100 // Default fallback for testing
		}
	} else {
		// Get admin from database using Clerk ID
		adminUser, err := h.queries.GetUser(r.Context(), clerkUser.ID)
		if err != nil {
			log.Printf("Error getting admin from database: %v", err)
			// Use fallback if we can't find admin
			if req.LandlordID > 0 {
				adminID = req.LandlordID
			} else {
				adminID = 100 // Default fallback
			}
		} else {
			adminID = adminUser.ID
			adminEmail = adminUser.Email
			adminName = fmt.Sprintf("%s %s", adminUser.FirstName, adminUser.LastName)
		}
	}

	// 3. Validate tenant ID and get tenant details
	if req.TenantID <= 0 {
		// If no tenant ID provided, try to look up tenant by name
		log.Printf("No tenant ID provided, using name lookup for '%s'", req.TenantName)

		// In a real implementation, you'd search for the tenant by name in the database
		// For now, use the tenant info from the request
		if req.TenantName == "" || req.TenantEmail == "" {
			http.Error(w, "Tenant name and email are required", http.StatusBadRequest)
			return
		}
	} else {
		// Get tenant by ID from database
		tenant, err := h.queries.GetUserByID(r.Context(), req.TenantID)
		if err != nil {
			log.Printf("Error getting tenant with ID %d: %v", req.TenantID, err)
			// If we can't find the tenant by ID but have name/email, continue with request data
			if req.TenantName == "" || req.TenantEmail == "" {
				http.Error(w, fmt.Sprintf("Tenant with ID %d not found", req.TenantID), http.StatusNotFound)
				return
			}
		} else {
			// Use tenant data from database
			req.TenantName = fmt.Sprintf("%s %s", tenant.FirstName, tenant.LastName)
			req.TenantEmail = tenant.Email
		}
	}

	// 4. Validate apartment ID and check for existing active leases
	if req.ApartmentID <= 0 {
		http.Error(w, "Valid apartment ID is required", http.StatusBadRequest)
		return
	}

	// Check if apartment exists and if it has an active lease
	leases, err := h.queries.ListLeases(r.Context())
	if err != nil {
		log.Printf("Error listing leases: %v", err)
		http.Error(w, "Failed to verify apartment availability", http.StatusInternalServerError)
		return
	}

	// Check if apartment has an active lease
	for _, lease := range leases {
		if lease.ApartmentID == req.ApartmentID && lease.LeaseStatus == "active" {
			http.Error(w, fmt.Sprintf("Apartment %d already has an active lease", req.ApartmentID), http.StatusConflict)
			return
		}
	}

	// 5. Parse and validate dates
	startDate, err := time.Parse("2006-01-02", req.StartDate)
	if err != nil {
		http.Error(w, "Invalid start date format. Use YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	endDate, err := time.Parse("2006-01-02", req.EndDate)
	if err != nil {
		http.Error(w, "Invalid end date format. Use YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	if endDate.Before(startDate) {
		http.Error(w, "End date must be after start date", http.StatusBadRequest)
		return
	}

	// 6. Generate lease PDF with tenant info
	leasePDF, err := h.GenerateLeaseTemplatePDF(
		req.DocumentTitle,
		req.TenantName,
		req.RentAmount,
		req.PropertyAddress,
	)
	if err != nil {
		log.Printf("Error generating lease PDF: %v", err)
		http.Error(w, "Failed to generate lease PDF", http.StatusInternalServerError)
		return
	}

	// 7. Create signers array for Documenso
	signers := []documenso.Signer{
		{
			Name:  req.TenantName,
			Email: req.TenantEmail,
			Role:  documenso.SignerRoleSigner,
		},
	}

	// Add landlord as viewer if we have admin info
	if adminEmail != "" {
		signers = append(signers, documenso.Signer{
			Name:  adminName,
			Email: adminEmail,
			Role:  documenso.SignerRoleViewer,
		})
	} else {
		// Use fallback landlord info for development
		signers = append(signers, documenso.Signer{
			Name:  "Property Manager",
			Email: "manager@example.com",
			Role:  documenso.SignerRoleViewer,
		})
	}

	// 8. Upload to Documenso with signers
	docID, err := h.documenso_client.UploadDocumentWithSigners(leasePDF, req.DocumentTitle, signers)
	if err != nil {
		log.Printf("Error uploading to Documenso: %v", err)
		http.Error(w, fmt.Sprintf("Failed to upload lease PDF: %v", err), http.StatusInternalServerError)
		return
	}

	// 9. Store lease in database with all validated data
	leaseParams := db.CreateLeaseParams{
		LeaseVersion:   1,
		ExternalDocID:  docID,
		TenantID:       req.TenantID,
		LandlordID:     adminID,
		ApartmentID:    req.ApartmentID,
		LeaseStartDate: pgtype.Date{Time: startDate, Valid: true},
		LeaseEndDate:   pgtype.Date{Time: endDate, Valid: true},
		RentAmount:     pgtype.Numeric{Int: big.NewInt(int64(req.RentAmount * 100)), Exp: -2, Valid: true},
		LeaseStatus:    db.LeaseStatus("pending_approval"),
		LeasePdf:       leasePDF,
		CreatedBy:      adminID,
		UpdatedBy:      adminID,
	}

	leaseID, err := h.queries.CreateLease(r.Context(), leaseParams)
	if err != nil {
		log.Printf("Error creating lease in database: %v", err)
		http.Error(w, fmt.Sprintf("Failed to store lease in database: %v", err), http.StatusInternalServerError)
		return
	}

	// 10. Return success response with lease details
	resp := map[string]interface{}{
		"lease_id":        leaseID,
		"external_doc_id": docID,
		"lease_sign_url":  fmt.Sprintf("https://documenso.com/sign/%s", docID),
		"tenant_name":     req.TenantName,
		"tenant_email":    req.TenantEmail,
		"status":          "pending_approval",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}
