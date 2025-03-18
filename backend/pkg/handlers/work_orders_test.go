package handlers_test

import (
	"bytes"
	"encoding/json"
	"go.uber.org/mock/gomock"
	"net/http"
	"net/http/httptest"
	"testing"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/mocks"
	"github.com/careecodes/RentDaddy/pkg/handlers"
	"github.com/jackc/pgx/v5/pgxpool"
)

func TestCreateWorkOrderHandler(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockDB := mocks.NewMockDBTX(ctrl)
	mockQueries := db.New(mockDB)

	handler := handlers.NewWorkOrderHandler(&pgxpool.Pool{}, mockQueries)

	workOrder := db.WorkOrder{
		ID:          1,
		OrderNumber: 12345,
		Status:      db.StatusOpen,
		Description: "Test work order",
		Category:    db.WorkCategoryCarpentry,
		CreatedBy:   1,
		UnitNumber:  101,
		Title:       "Test Title",
	}

	mockDB.EXPECT().Exec(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)

	reqBody, _ := json.Marshal(workOrder)
	req := httptest.NewRequest(http.MethodPost, "/work_orders", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	handler.CreateWorkOrderHandler(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		t.Errorf("expected status %d, got %d", http.StatusCreated, resp.StatusCode)
	}
}
