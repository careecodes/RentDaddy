package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/pkg/handlers"
	"github.com/stretchr/testify/assert"
)

func TestCreateLeaseHandler(t *testing.T) {
	// Use a test transaction to ensure DB cleanup after test
	ctx, rollback := SetupTestTransaction(t)
	defer rollback()

	// Fetch required test data
	var tenantID, createdBy int64
	err := testDB.QueryRow(ctx, `SELECT id FROM users WHERE role = 'tenant' LIMIT 1`).Scan(&tenantID)
	assert.NoError(t, err, "Tenant ID should exist")

	err = testDB.QueryRow(ctx, `SELECT id FROM users WHERE role = 'admin' LIMIT 1`).Scan(&createdBy)
	assert.NoError(t, err, "CreatedBy ID should exist")

	// Create test request body
	reqBody, err := json.Marshal(handlers.CreateLeaseRequest{
		Lease: db.Lease{ // Embed Lease fields
			TenantID:  tenantID,
			CreatedBy: createdBy,
		},
		StartDate:     time.Now(),
		EndDate:       time.Now().AddDate(1, 0, 0),
		RentAmount:    1500.00,
		DocumentTitle: "Test Lease",
	})

	assert.NoError(t, err, "Request body should be valid JSON")

	// Create test request
	req, err := http.NewRequest("POST", "/leases", bytes.NewBuffer(reqBody))
	assert.NoError(t, err, "Request should be created")
	req.Header.Set("Content-Type", "application/json")

	// Record response
	rr := httptest.NewRecorder()

	// Initialize LeaseHandler with real queries
	handler := handlers.NewLeaseHandler(testDB, queries)

	// Call handler
	handler.CreateLease(rr, req)

	// Assert response status
	assert.Equal(t, http.StatusOK, rr.Code, "Expected status OK")

	// Parse response JSON
	var response handlers.CreateLeaseResponse
	err = json.Unmarshal(rr.Body.Bytes(), &response)
	assert.NoError(t, err, "Response should be valid JSON")
	assert.NotZero(t, response.LeaseID, "Lease ID should be non-zero")

	// Verify lease exists in database
	var leaseExists bool
	err = testDB.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM leases WHERE id = $1)`, response.LeaseID).Scan(&leaseExists)
	assert.NoError(t, err, "Database query should succeed")
	assert.True(t, leaseExists, "Lease should exist in database")
}
