package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	lease_models "github.com/careecodes/RentDaddy/pkg/models"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
)

var testDB *pgxpool.Pool
var queries *db.Queries

func init() {
	ctx := context.Background()
	dbUrl := os.Getenv("PG_URL")
	if dbUrl == "" {
		log.Fatal("PG_URL is not set")
	}

	pool, err := pgxpool.New(ctx, dbUrl)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	queries = db.New(pool)
}
func seedTestData(db *pgxpool.Pool) error {
	ctx := context.Background()

	// ✅ Check if users exist before inserting
	var exists bool
	err := db.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM users WHERE email = 'johndoe@example.com')`).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		_, err = db.Exec(ctx, `
			INSERT INTO users (clerk_id, first_name, last_name, email, phone, unit_number, role, status, last_login, updated_at, created_at) VALUES
			('clerk_001', 'John', 'Doe', 'johndoe@example.com', '123-456-7890', NULL, 'tenant', 'active', NOW(), NOW(), NOW()),
			('clerk_002', 'Jane', 'Smith', 'janesmith@example.com', '987-654-3210', NULL, 'landlord', 'active', NOW(), NOW(), NOW()),
			('clerk_999', 'Admin', 'User', 'admin@example.com', '555-555-5555', NULL, 'admin', 'active', NOW(), NOW(), NOW());
		`)
		if err != nil {
			return err
		}
	}

	// ✅ Check if leases exist before inserting
	err = db.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM leases WHERE lease_number = 10001)`).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		_, err = db.Exec(ctx, `
			INSERT INTO leases (lease_number, external_doc_id, tenant_id, landlord_id, lease_start_date, lease_end_date, rent_amount, lease_status, created_by, updated_by, updated_at, created_at)
			SELECT 
				10001, CONCAT('DOC-', 10001), u.id, l.id, '2024-01-01', '2025-01-01', 1200.50, 'active', a.id, a.id, NOW(), NOW()
			FROM users u, users l, users a
			WHERE u.role = 'tenant' AND l.role = 'landlord' AND a.role = 'admin'
			LIMIT 1;
		`)
		if err != nil {
			return err
		}
	}

	// ✅ Check if apartments exist before inserting
	err = db.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM apartments WHERE unit_number = 101)`).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		_, err = db.Exec(ctx, `
			INSERT INTO apartments (unit_number, price, size, management_id, availability, lease_id, lease_start_date, lease_end_date, created_at, updated_at) 
			VALUES 
			(101, 1200.50, 850, 1, TRUE, 
				(SELECT id FROM leases WHERE lease_number = 10001 LIMIT 1), 
				(SELECT lease_start_date FROM leases WHERE lease_number = 10001 LIMIT 1),
				(SELECT lease_end_date FROM leases WHERE lease_number = 10001 LIMIT 1),
				NOW(), NOW());
		`)
		if err != nil {
			return err
		}
	}

	return nil
}

func TestMain(m *testing.M) {
	fmt.Println("PG_URL:", os.Getenv("PG_URL"))
	dbUrl := os.Getenv("PG_URL")
	if dbUrl == "" {
		panic("PG_URL is not set. Please define a database connection.")
	}

	var err error
	testDB, err = pgxpool.New(context.Background(), dbUrl)
	if err != nil {
		panic("Failed to connect to test database: " + err.Error())
	}

	if err := seedTestData(testDB); err != nil {
		panic("Failed to insert test data: " + err.Error())
	}

	code := m.Run()
	testDB.Close()
	os.Exit(code)
}

func TestCreateLeaseHandler(t *testing.T) {
	// Fetch tenant and landlord IDs from the database
	var tenantID, landlordID, createdBy int64
	err := testDB.QueryRow(context.Background(), `
		SELECT id FROM users WHERE role = 'tenant' LIMIT 1;
	`).Scan(&tenantID)
	assert.NoError(t, err, "Tenant ID should be found")

	err = testDB.QueryRow(context.Background(), `
		SELECT id FROM users WHERE role = 'landlord' LIMIT 1;
	`).Scan(&landlordID)
	assert.NoError(t, err, "Landlord ID should be found")

	err = testDB.QueryRow(context.Background(), `
		SELECT id FROM users WHERE role = 'admin' LIMIT 1;
	`).Scan(&createdBy)
	assert.NoError(t, err, "CreatedBy ID should be found")

	reqBody, err := json.Marshal(lease_models.CreateLeaseRequest{
		TenantID:      tenantID,
		LandlordID:    landlordID,
		StartDate:     time.Now(),
		EndDate:       time.Now().AddDate(1, 0, 0),
		RentAmount:    1500.00,
		DocumentTitle: "New Lease Agreement",
		CreatedBy:     createdBy,
	})
	assert.NoError(t, err, "Request body should be valid JSON")

	req, err := http.NewRequest("POST", "/leases", bytes.NewBuffer(reqBody))
	assert.NoError(t, err, "Request should be created")

	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { CreateLeaseHandler(w, r, queries) })
	handler.ServeHTTP(rr, req)

	t.Logf("Response: %v", rr.Body.String())

	assert.Equal(t, http.StatusOK, rr.Code, "Expected status OK")
}
