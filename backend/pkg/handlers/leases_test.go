package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/pkg/handlers"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
)

// Global variables for DB connection
var testDB *pgxpool.Pool
var queries *db.Queries

// Initialize the test database connection
func TestMain(m *testing.M) {
	dbURL := os.Getenv("PG_URL")
	if dbURL == "" {
		dbURL = "postgres://appuser:apppassword@localhost:5432/appdb?sslmode=disable"
	}

	var err error
	testDB, err = pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to test database: %v", err)
	}
	queries = db.New(testDB)

	// Run tests
	code := m.Run()

	// Clean up
	testDB.Close()
	os.Exit(code)
}

// Setup a test transaction (ensures test data is rolled back after each test)
func setupTestTransaction(t *testing.T) (context.Context, func()) {
	ctx := context.Background()
	tx, err := testDB.Begin(ctx)
	assert.NoError(t, err, "Failed to begin test transaction")

	// Rollback function to clean up test data after test execution
	rollback := func() {
		err := tx.Rollback(ctx)
		assert.NoError(t, err, "Failed to rollback test transaction")
	}
	type ctxKey string

	const txKey ctxKey = "tx"

	return context.WithValue(ctx, txKey, tx), rollback
}

func TestCreateLeaseHandler(t *testing.T) {
	// Use a test transaction to ensure DB cleanup after test
	ctx, rollback := setupTestTransaction(t)
	defer rollback()

	// Fetch required test data
	var tenantID, landlordID, createdBy int64
	err := testDB.QueryRow(ctx, `SELECT id FROM users WHERE role = 'tenant' LIMIT 1`).Scan(&tenantID)
	assert.NoError(t, err, "Tenant ID should exist")

	err = testDB.QueryRow(ctx, `SELECT id FROM users WHERE role = 'landlord' LIMIT 1`).Scan(&landlordID)
	assert.NoError(t, err, "Landlord ID should exist")

	err = testDB.QueryRow(ctx, `SELECT id FROM users WHERE role = 'admin' LIMIT 1`).Scan(&createdBy)
	assert.NoError(t, err, "CreatedBy ID should exist")

	// Create test request body
	reqBody, err := json.Marshal(handlers.CreateLeaseRequest{
		Lease: db.Lease{ // Embed Lease fields
			TenantID:   tenantID,
			LandlordID: landlordID,
			CreatedBy:  createdBy,
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
