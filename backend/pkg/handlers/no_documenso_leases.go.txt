package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/internal/smtp"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	cron "github.com/robfig/cron/v3"
	"github.com/unidoc/unipdf/v3/core"
	"github.com/unidoc/unipdf/v3/model"
)

func (h LeaseHandler) UploadLeaseTemplate(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Error parsing multipart form", http.StatusBadRequest)
	} // 10MB max size
	file, header, err := r.FormFile("lease_template")
	if err != nil {
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	templateName := header.Filename
	s3Key := fmt.Sprintf("templates/%s", templateName)

	_, err = h.s3.PutObject(&s3.PutObjectInput{
		Bucket: aws.String(h.bucket),
		Key:    aws.String(s3Key),
		Body:   file,
		ACL:    aws.String("private"),
	})
	if err != nil {
		http.Error(w, "Error uploading template", http.StatusInternalServerError)
		return
	}

	// Store template info in DB
	templateID, err := h.queries.CreateLeaseTemplate(context.Background(), db.CreateLeaseTemplateParams{
		TemplateName: templateName,
		S3Key:        s3Key,
		CreatedBy:    1, // TODO: Use authenticated user ID
	})
	if err != nil {
		http.Error(w, "Failed to store lease template", http.StatusInternalServerError)
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message":     "Lease template uploaded successfully",
		"template_id": templateID,
	})
}

// CreateLeaseRequest - Input Structure
type CreateLeaseRequest struct {
	LeaseVersion    int32     `json:"lease_version"`
	LeaseFileKey    string    `json:"lease_file_key"`
	LeaseTemplateID int32     `json:"lease_template_id"`
	TenantID        int32     `json:"tenant_id"`
	LandlordID      int32     `json:"landlord_id"`
	ApartmentID     int32     `json:"apartment_id"`
	LeaseStartDate  time.Time `json:"lease_start_date"`
	LeaseEndDate    time.Time `json:"lease_end_date"`
	RentAmount      float64   `json:"rent_amount"`
	LeaseStatus     string    `json:"lease_status"`
	CreatedBy       int32     `json:"created_by"`
	UpdatedBy       int32     `json:"updated_by"`
}

// CreateLease - Admin Creates a Lease
func (h LeaseHandler) CreateLease(w http.ResponseWriter, r *http.Request) {
	var req CreateLeaseRequest

	// Decode JSON Request
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON request", http.StatusBadRequest)
		return
	}

	// Validate Input
	if req.TenantID == 0 || req.LandlordID == 0 || req.ApartmentID == 0 || req.LeaseStartDate.IsZero() || req.LeaseEndDate.IsZero() {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Execute SQL Query
	// Execute SQL Query
	// Execute SQL Query
	// Execute SQL Query
	id, err := h.queries.CreateLease(context.Background(), db.CreateLeaseParams{
		LeaseVersion:    int64(req.LeaseVersion),
		LeaseFileKey:    pgtype.Text{String: req.LeaseFileKey, Valid: req.LeaseFileKey != ""},
		LeaseTemplateID: pgtype.Int4{Int32: req.LeaseTemplateID, Valid: req.LeaseTemplateID != 0},
		TenantID:        int64(req.TenantID),
		LandlordID:      int64(req.LandlordID),
		LeaseStartDate:  pgtype.Date{Time: req.LeaseStartDate, Valid: true},
		LeaseEndDate:    pgtype.Date{Time: req.LeaseEndDate, Valid: true},
		RentAmount:      floatToPgNumeric(req.RentAmount),
		LeaseStatus:     req.LeaseStatus,
		CreatedBy:       int64(req.CreatedBy),
		UpdatedBy:       int64(req.UpdatedBy),
	})

	if err != nil {
		http.Error(w, "Failed to create lease", http.StatusInternalServerError)
		return
	}

	// Success Response
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":  "Lease created successfully",
		"lease_id": id,
	})
}

// Convert float64 to pgtype.Numeric
func floatToPgNumeric(value float64) pgtype.Numeric {
	var num pgtype.Numeric
	bigFloat := new(big.Float).SetFloat64(value) // Convert float64 to *big.Float
	bigInt, accuracy := bigFloat.Int(nil)        // Convert *big.Float to *big.Int

	if accuracy != big.Exact {
		num.Valid = false // If conversion isn't exact, mark as invalid
		return num
	}

	num.Int = bigInt
	num.Valid = true
	return num
}

// Prefill lease document from template
func (h LeaseHandler) GenerateLeaseDocument(w http.ResponseWriter, r *http.Request) {
	leaseIDStr := chi.URLParam(r, "id")
	leaseID, err := strconv.Atoi(leaseIDStr)
	if err != nil {
		http.Error(w, "Invalid lease ID", http.StatusBadRequest)
		return
	}
	leaseID32 := int32(leaseID)

	// Fetch lease with template info
	lease, err := h.queries.GetLeaseWithTemplate(context.Background(), leaseID32)
	if err != nil {
		http.Error(w, "Lease not found", http.StatusNotFound)
		return
	}

	// Download template from S3
	s3Client := h.s3
	getObjInput := &s3.GetObjectInput{
		Bucket: aws.String(h.bucket),
		Key:    aws.String(lease.TemplateS3Key),
	}

	obj, err := s3Client.GetObject(getObjInput)
	if err != nil {
		http.Error(w, "Error fetching template", http.StatusInternalServerError)
		return
	}
	defer obj.Body.Close()

	// Read the PDF file into memory
	buf := new(bytes.Buffer)
	_, err = io.Copy(buf, obj.Body)
	if err != nil {
		http.Error(w, "Error reading template", http.StatusInternalServerError)
		return
	}

	// Load PDF and fill AcroForm fields
	pdfReader, err := model.NewPdfReader(bytes.NewReader(buf.Bytes()))
	if err != nil {
		http.Error(w, "Error opening PDF", http.StatusInternalServerError)
		return
	}

	// Create a new PDF writer
	pdfWriter := model.NewPdfWriter()

	numPages, err := pdfReader.GetNumPages()
	if err != nil {
		http.Error(w, "Error getting page count", http.StatusInternalServerError)
		return
	}

	for i := 0; i < numPages; i++ {
		page, err := pdfReader.GetPage(i + 1)
		if err != nil {
			http.Error(w, "Error reading page", http.StatusInternalServerError)
			return
		}
		err = pdfWriter.AddPage(page)
		if err != nil {
			http.Error(w, "Error adding page to PDF", http.StatusInternalServerError)
			return
		}
	}

	// Load AcroForm fields
	acroForm := pdfReader.AcroForm
	if acroForm == nil {
		http.Error(w, "PDF does not contain AcroForm fields", http.StatusInternalServerError)
		return
	}

	// Get all form fields
	fields := *acroForm.Fields
	if len(fields) == 0 {
		http.Error(w, "No AcroForm fields found in PDF", http.StatusInternalServerError)
		return
	}

	// Convert RentAmount to string
	var rentAmountStr string
	if lease.RentAmount.Valid && lease.RentAmount.Int != nil {
		rentAmountStr = lease.RentAmount.Int.String()
	} else {
		rentAmountStr = "0"
	}

	// Set field values using core.MakeString()
	for _, field := range fields {
		fieldName := field.T.String()
		switch fieldName {
		case "TenantName":
			field.V = core.MakeString(strconv.Itoa(int(lease.TenantID)))
		case "LeaseStart":
			field.V = core.MakeString(lease.LeaseStartDate.Time.Format("2006-01-02"))
		case "LeaseEnd":
			field.V = core.MakeString(lease.LeaseEndDate.Time.Format("2006-01-02"))
		case "RentAmount":
			field.V = core.MakeString(rentAmountStr)
		}
	}

	// Write the modified PDF to a buffer
	modifiedPDF := new(bytes.Buffer)
	err = pdfWriter.Write(modifiedPDF) // ✅ FIXED
	if err != nil {
		http.Error(w, "Error generating filled PDF", http.StatusInternalServerError)
		return
	}

	// Upload generated lease to S3
	newLeaseKey := fmt.Sprintf("leases/%d_filled.pdf", lease.ID)
	_, err = s3Client.PutObject(&s3.PutObjectInput{
		Bucket: aws.String(h.bucket),
		Key:    aws.String(newLeaseKey),
		Body:   bytes.NewReader(modifiedPDF.Bytes()),
		ACL:    aws.String("private"),
	})
	if err != nil {
		http.Error(w, "Error uploading lease", http.StatusInternalServerError)
		return
	}

	// Update database with new lease file key
	err = h.queries.UpdateLeaseFileKey(context.Background(), db.UpdateLeaseFileKeyParams{
		LeaseFileKey: pgtype.Text{String: newLeaseKey, Valid: true},
		UpdatedBy:    lease.UpdatedBy,
		ID:           lease.ID,
	})
	if err != nil {
		http.Error(w, "Database update failed", http.StatusInternalServerError)
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]string{
		"message":   "Lease document generated successfully",
		"lease_url": fmt.Sprintf("https://%s.s3.amazonaws.com/%s", h.bucket, newLeaseKey),
	})

}

// LeaseHandler handles lease-related operations.
type LeaseHandler struct {
	pool    *pgxpool.Pool
	queries *db.Queries
	s3      *s3.S3
	bucket  string
}

// NewLeaseHandler initializes a new LeaseHandler.
func NewLeaseHandler(pool *pgxpool.Pool, queries *db.Queries) *LeaseHandler {
	sess, err := session.NewSession(&aws.Config{
		Region: aws.String("us-east-1"),
		Credentials: credentials.NewStaticCredentials(
			os.Getenv("AWS_ACCESS_KEY_ID"),
			os.Getenv("AWS_SECRET_ACCESS_KEY"), ""),
	})
	if err != nil {
		log.Fatalf("Failed to initialize S3 session: %v", err)
	}

	return &LeaseHandler{
		pool:    pool,
		queries: queries,
		s3:      s3.New(sess),
		bucket:  "rentdaddydocumenso",
	}

}

// GenerateLeaseURL generates a pre-signed S3 URL for lease document viewing.
func (h LeaseHandler) GenerateLeaseURL(lease db.Lease) (string, error) {
	// Ensure lease file key exists
	if !lease.LeaseFileKey.Valid {
		return "", fmt.Errorf("lease file key is empty")
	}

	// Generate S3 pre-signed URL
	req, _ := h.s3.GetObjectRequest(&s3.GetObjectInput{
		Bucket: aws.String(h.bucket),
		Key:    aws.String(lease.LeaseFileKey.String),
	})
	urlStr, err := req.Presign(15 * time.Minute) // URL valid for 15 minutes
	if err != nil {
		return "", fmt.Errorf("failed to generate signed URL: %w", err)
	}
	return urlStr, nil
}

// GetLeaseByID retrieves a lease and returns its signed URL.
func (h LeaseHandler) GetLeaseByID(w http.ResponseWriter, r *http.Request) {
	leaseIDStr := chi.URLParam(r, "id")
	leaseID, err := strconv.Atoi(leaseIDStr)
	if err != nil {
		http.Error(w, "Invalid lease ID", http.StatusBadRequest)
		return
	}
	leaseID32 := int32(leaseID)

	leaseRow, err := h.queries.GetLeaseByID(context.Background(), leaseID32)
	if err != nil {
		http.Error(w, "Lease not found", http.StatusNotFound)
		return
	}

	// Convert db.GetLeaseByIDRow to db.Lease
	lease := db.Lease{
		ID:             leaseRow.ID,
		LeaseVersion:   leaseRow.LeaseVersion,
		LeaseFileKey:   leaseRow.LeaseFileKey,
		TenantID:       leaseRow.TenantID,
		LandlordID:     leaseRow.LandlordID,
		ApartmentID:    leaseRow.ApartmentID,
		LeaseStartDate: leaseRow.LeaseStartDate,
		LeaseEndDate:   leaseRow.LeaseEndDate,
		RentAmount:     leaseRow.RentAmount,
		LeaseStatus:    leaseRow.LeaseStatus,
		CreatedBy:      leaseRow.CreatedBy,
		UpdatedBy:      leaseRow.UpdatedBy,
		CreatedAt:      leaseRow.CreatedAt,
		UpdatedAt:      leaseRow.UpdatedAt,
	}

	// Now pass it to GenerateLeaseURL
	url, err := h.GenerateLeaseURL(lease)
	if err != nil {
		http.Error(w, "Error generating lease URL", http.StatusInternalServerError)
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]string{"lease_url": url})

}

// RenewLease renews a lease.
func (h LeaseHandler) RenewLease(w http.ResponseWriter, r *http.Request) {
	var req struct {
		LeaseID    int32  `json:"lease_id"`
		EndDate    string `json:"end_date"`
		RentAmount string `json:"rent_amount"`
		UpdatedBy  int64  `json:"updated_by"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	err := h.queries.RenewLease(context.Background(), db.RenewLeaseParams{
		LeaseEndDate: pgtype.Date{Time: parseDate(req.EndDate), Valid: true},
		RentAmount:   parseNumeric(req.RentAmount), // Correctly parse numeric values
		UpdatedBy:    req.UpdatedBy,
		ID:           req.LeaseID,
	})
	if err != nil {
		http.Error(w, "Lease renewal failed", http.StatusInternalServerError)
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]string{"message": "Lease renewed successfully"})
}

// Convert a string to pgtype.Numeric
func parseNumeric(value string) pgtype.Numeric {
	var num pgtype.Numeric
	bigInt := new(big.Int) // Correctly initialize *big.Int

	// Try parsing the value as an integer
	_, success := bigInt.SetString(value, 10) // Base 10 conversion
	if !success {
		num.Valid = false // Mark as invalid if conversion fails
		return num
	}

	// Assign correctly as a pointer
	num.Int = bigInt
	num.Valid = true
	return num
}

// Utility function to respond with JSON.
func (h LeaseHandler) respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(w, `{"error": "Failed to encode response"}`, http.StatusInternalServerError)
	}
}

// Utility function to parse dates.
func parseDate(dateStr string) time.Time {
	t, _ := time.Parse("2006-01-02", dateStr)
	return t
}

func ActivateRenewedLeases(db *sql.DB) {
	query := `
		UPDATE leases
		SET lease_status = 'active'
		WHERE lease_status = 'renewed' 
		AND lease_start_date <= CURRENT_DATE;
	`
	_, err := db.Exec(query)
	if err != nil {
		log.Printf("Error updating renewed leases to active: %v", err)
	} else {
		log.Println("✅ Successfully updated renewed leases to active.")
	}
}
func StartLeaseActivationCron(db *sql.DB) {
	c := cron.New(cron.WithSeconds())                                      // Ensure cron is properly initialized
	_, err := c.AddFunc("0 0 * * *", func() { ActivateRenewedLeases(db) }) // Runs at midnight daily
	if err != nil {
		log.Fatalf("Error initializing cron job: %v", err)
	}
	c.Start()
}

// CreateLeaseFromTemplate - Admin Creates Lease from Template
func (h *LeaseHandler) CreateLeaseFromTemplate(w http.ResponseWriter, r *http.Request) {
	var req CreateLeaseRequest

	// Decode JSON Request
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid JSON request", http.StatusBadRequest)
		return
	}

	// Validate Input
	if req.TenantID == 0 || req.LandlordID == 0 || req.ApartmentID == 0 || req.LeaseTemplateID == 0 {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Fetch lease template using `GetLeaseWithTemplate`
	leaseTemplate, err := h.queries.GetLeaseWithTemplate(context.Background(), req.LeaseTemplateID)
	if err != nil {
		http.Error(w, "Lease template not found", http.StatusNotFound)
		return
	}

	// Download template from S3
	s3Client := h.s3
	getObjInput := &s3.GetObjectInput{
		Bucket: aws.String(h.bucket),
		Key:    aws.String(leaseTemplate.TemplateS3Key),
	}
	obj, err := s3Client.GetObject(getObjInput)
	if err != nil {
		http.Error(w, "Error fetching template", http.StatusInternalServerError)
		return
	}
	defer obj.Body.Close()

	// Read the PDF file into memory
	buf := new(bytes.Buffer)
	_, err = io.Copy(buf, obj.Body)
	if err != nil {
		http.Error(w, "Error reading template", http.StatusInternalServerError)
		return
	}

	// Load PDF and fill AcroForm fields
	pdfReader, err := model.NewPdfReader(bytes.NewReader(buf.Bytes()))
	if err != nil {
		http.Error(w, "Error opening PDF", http.StatusInternalServerError)
		return
	}

	// Create a new PDF writer
	pdfWriter := model.NewPdfWriter()
	for i := 0; i < len(pdfReader.PageList); i++ {
		page, err := pdfReader.GetPage(i + 1)
		if err != nil {
			http.Error(w, "Error reading page", http.StatusInternalServerError)
			return
		}
		err = pdfWriter.AddPage(page)
		if err != nil {
			http.Error(w, "Error adding page to PDF", http.StatusInternalServerError)
			return
		}
	}

	// Load AcroForm fields and populate them
	for _, field := range *pdfReader.AcroForm.Fields {
		fieldName := field.T.String()
		switch fieldName {
		case "TenantName":
			field.V = core.MakeString(strconv.Itoa(int(req.TenantID)))
		case "LeaseStart":
			field.V = core.MakeString(req.LeaseStartDate.Format("2006-01-02"))
		case "LeaseEnd":
			field.V = core.MakeString(req.LeaseEndDate.Format("2006-01-02"))
		case "RentAmount":
			field.V = core.MakeString(fmt.Sprintf("%.2f", req.RentAmount))
		}
	}

	// Write the modified PDF to a buffer
	modifiedPDF := new(bytes.Buffer)
	err = pdfWriter.Write(modifiedPDF)
	if err != nil {
		http.Error(w, "Error generating filled PDF", http.StatusInternalServerError)
		return
	}

	// Upload generated lease to S3
	newLeaseKey := fmt.Sprintf("leases/%d_filled.pdf", req.TenantID)
	_, err = s3Client.PutObject(&s3.PutObjectInput{
		Bucket: aws.String(h.bucket),
		Key:    aws.String(newLeaseKey),
		Body:   bytes.NewReader(modifiedPDF.Bytes()),
		ACL:    aws.String("private"),
	})
	if err != nil {
		http.Error(w, "Error uploading lease", http.StatusInternalServerError)
		return
	}

	// Store lease in DB
	id, err := h.queries.CreateLease(context.Background(), db.CreateLeaseParams{
		LeaseVersion:    1,
		LeaseFileKey:    pgtype.Text{String: newLeaseKey, Valid: true},
		LeaseTemplateID: pgtype.Int4{Int32: req.LeaseTemplateID, Valid: true},
		TenantID:        int64(req.TenantID),
		LandlordID:      int64(req.LandlordID),
		ApartmentID:     pgtype.Int8{Int64: int64(req.ApartmentID), Valid: req.ApartmentID != 0},
		LeaseStartDate:  pgtype.Date{Time: req.LeaseStartDate, Valid: true},
		LeaseEndDate:    pgtype.Date{Time: req.LeaseEndDate, Valid: true},
		RentAmount:      pgtype.Numeric{Valid: true},
		LeaseStatus:     "pending",
		CreatedBy:       int64(req.CreatedBy),
		UpdatedBy:       int64(req.UpdatedBy),
	})

	if err != nil {
		http.Error(w, "Failed to store lease", http.StatusInternalServerError)
		return
	}

	// Send email to tenant with signing link
	signingURL := fmt.Sprintf("https://yourapp.com/tenant/lease/sign/%d", id)
	emailBody := fmt.Sprintf("Your lease is ready for signing. Click the link: %s", signingURL)

	err = smtp.SendEmail("tenant@example.com", "Lease Signing Request", emailBody)
	if err != nil {
		http.Error(w, "Failed to send email", http.StatusInternalServerError)
		return
	}

	h.respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message":  "Lease created successfully",
		"lease_id": id,
		"sign_url": signingURL,
	})
}
