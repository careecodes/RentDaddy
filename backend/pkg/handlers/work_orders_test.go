package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/bxcodec/faker/v4"
	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/pkg/handlers"
	"github.com/jackc/pgx/v5/pgtype"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestBasic(t *testing.T) {
	expect := "Hello, World!"
	result := fmt.Sprintf("Hello, World!")

	if result != expect {
		t.Errorf("Expected %s, but got %s", expect, result)
	} else {
		t.Logf("Test passed: expected %s and got %s", expect, result)
	}

}

func setupTestUser(t *testing.T) int64 {
	// Create a new test user
	clerkID := "clerk_user_id"
	user, err := queries.GetUserByClerkID(context.Background(), clerkID)
	if err == nil {
		t.Logf("User already exists with ClerkID: %s", clerkID)
		t.Logf("User details: %v", user)
		return user.ID
	} else {
		t.Logf("Creating new user with ClerkID: %s", clerkID)

		userParams := db.CreateUserParams{
			ClerkID:   clerkID,
			FirstName: faker.FirstName(),
			LastName:  faker.LastName(),
			Email:     faker.Email(),
			Phone:     pgtype.Text{String: "1234567890"},
			Role:      db.RoleTenant,
			LastLogin: pgtype.Timestamp{Time: time.Now(), Valid: true},
		}
		user, err := queries.CreateUser(context.Background(), userParams)
		if err != nil {
			t.Fatalf("Failed to create test user: %v", err)
		}

		return user.ID
	}
}

func setupWorkOrderEntries(t *testing.T, userID int64) {
	var workOrders []db.WorkOrder

	rowCount, err := testDB.Exec(context.Background(), "SELECT COUNT(*) FROM work_orders WHERE created_by = $1", userID)
	if err != nil {
		t.Fatalf("Failed to check existing work orders: %v", err)
	}
	// convert rowCount to int
	count := rowCount.RowsAffected()

	for i := 0; i < 10; i++ {
		params := db.CreateWorkOrderParams{
			OrderNumber: count + int64(i+1),
			Status:      db.StatusOpen,
			Description: faker.Paragraph(),
			Category:    db.WorkCategoryCarpentry,
			CreatedBy:   userID,
			UnitNumber:  101 + int16(i),
			Title:       "Test Work Order",
		}

		workOrder, err := queries.CreateWorkOrder(context.Background(), params)
		if err != nil {
			t.Fatalf("Failed to create work order: %v", err)
		} else {
			workOrders = append(workOrders, workOrder)
			t.Logf("Created work order: %d", workOrder.ID)
		}
	}
}

// setup for work order entries tests
func setupTests(t *testing.T) (func(t *testing.T), int64) {
	userID := setupTestUser(t)
	setupWorkOrderEntries(t, userID)

	return func(t *testing.T) {
		_, err := testDB.Exec(context.Background(), `TRUNCATE TABLE "work_orders" RESTART IDENTITY CASCADE;`)
		if err != nil {
			t.Fatalf("Failed to drop work orders table: %v", err)
		}
		_, err = testDB.Exec(context.Background(), `TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;`)
		if err != nil {
			t.Fatalf("Failed to drop users table: %v", err)
		}

		t.Logf("Created users: %v", userID)
	}, userID
}

// TestWorkOrderHandler tests the work order handler
func TestWorkOrderHandler(t *testing.T) {
	teardown, _ := setupTests(t)
	defer teardown(t)

	// Create a new work order handler
	workOrderHandler := handlers.NewWorkOrderHandler(testDB, queries)

	// Create a test request
	req, err := http.NewRequest("GET", "/work_orders", nil)
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}

	// Create a response recorder to capture the response
	rr := httptest.NewRecorder()

	// Call the handler
	workOrderHandler.ListWorkOrdersHandler(rr, req)

	// Check the response status code
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Expected status code %d but got %d", http.StatusOK, status)
	}

	fmt.Println(rr.Body.String())
}

func TestCreateWorkOrderHandler(t *testing.T) {
	teardown, userID := setupTests(t)
	defer teardown(t)

	// Create a new work order handler
	workOrderHandler := handlers.NewWorkOrderHandler(testDB, queries)

	// Create a test request body
	reqBody := db.CreateWorkOrderParams{
		OrderNumber: 123,
		Status:      db.StatusOpen,
		Description: "Test Work Order",
		Category:    db.WorkCategoryCarpentry,
		CreatedBy:   userID,
		UnitNumber:  101,
		Title:       "Test Work Order",
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		t.Fatalf("Failed to marshal request body: %v", err)
	}

	req, err := http.NewRequest("POST", "/work_orders", bytes.NewBuffer(body))
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	// Create a response recorder to capture the response
	rr := httptest.NewRecorder()

	workOrderHandler.CreateWorkOrderHandler(rr, req)

	if status := rr.Code; status != http.StatusCreated {
		t.Logf("Response body: %s", rr.Body.String())
		t.Errorf("Expected status code %d but got %d", http.StatusCreated, status)
	}

	fmt.Println(rr.Body.String())
}
