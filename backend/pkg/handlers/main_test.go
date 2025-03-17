package handlers_test

import (
	"context"
	"github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"log"
	"os"
	"testing"
)

// Global variables for DB connection
var testDB *pgxpool.Pool
var queries *db.Queries

// Initialize the test database connection
func TestMain(m *testing.M) {
	dbURL := os.Getenv("PG_URL")
	if dbURL == "" {
		dbURL = "postgres://appuser:apppassword@localhost/appdb?sslmode=disable"
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
func SetupTestTransaction(t *testing.T) (context.Context, func()) {
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
