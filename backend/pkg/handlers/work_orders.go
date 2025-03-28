package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WorkOrderHandler struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewWorkOrderHandler(pool *pgxpool.Pool, queries *db.Queries) *WorkOrderHandler {
	return &WorkOrderHandler{
		pool:    pool,
		queries: queries,
	}
}

func (h WorkOrderHandler) GetWorkOrderHandler(w http.ResponseWriter, r *http.Request) {
	param := chi.URLParam(r, "order_id")

	workOrderNumber, err := strconv.Atoi(param)
	if err != nil {
		log.Printf("Error parsing work order number: %v", err)
		http.Error(w, "Invalid work order number", http.StatusBadRequest)
		return
	}

	workOrder, err := h.queries.GetWorkOrder(r.Context(), int64(workOrderNumber))
	if err != nil {
		log.Printf("Error fetching work order %d: %v", workOrderNumber, err)
		http.Error(w, "Work order not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(workOrder)
	if err != nil {
		log.Printf("Error marshalling work order %v", err)
		http.Error(w, "Failed to encode work order", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from GetWorkOrderHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}

func (h WorkOrderHandler) ListWorkOrdersHandler(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query()
	if url.Get("q") == "iam" {
		http.Error(w, "I'm a teapot", http.StatusTeapot) // I found it!!!!!
		return
	}

	workOrders, err := h.queries.ListWorkOrders(r.Context())
	if err != nil {
		log.Printf("Error fetching work orders: %v", err)
		http.Error(w, "Failed to fetch work orders", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(workOrders)
	if err != nil {
		log.Printf("Error marshalling work orders: %v", err)
		http.Error(w, "Failed to encode work orders", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from ListWorkOrdersHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}

type WorkOrdersRequest struct {
	OrderId     int64  `json:"order_id"`
	Status      string `json:"status"`
	Description string `json:"description"`
	Category    string `json:"category"`
	CreatedBy   int64  `json:"created_by"`
	UnitNumber  int16  `json:"unit_number"`
	Title       string `json:"title"`
}

func (h WorkOrderHandler) CreateWorkOrderHandler(w http.ResponseWriter, r *http.Request) {
	var params db.CreateWorkOrderParams

	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	workOrder, err := h.queries.CreateWorkOrder(r.Context(), params)
	if err != nil {
		log.Printf("Error creating work order: %v", err)
		http.Error(w, "Failed to create work order", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(workOrder)
	if err != nil {
		log.Printf("Error marshalling work order: %v", err)
		http.Error(w, "Failed to encode work order", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from CreateWorkOrderHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}

func (h *WorkOrderHandler) UpdateWorkOrderHandler(w http.ResponseWriter, r *http.Request) {
	param := chi.URLParam(r, "order_id")
	workOrderId, err := strconv.Atoi(param)
	if err != nil {
		log.Printf("Error parsing work order number: %v", err)
		http.Error(w, "Invalid work order number", http.StatusBadRequest)
		return
	}

	var updateParams db.UpdateWorkOrderParams
	if err := json.NewDecoder(r.Body).Decode(&updateParams); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	updateParams.ID = int64(workOrderId)
	err = h.queries.UpdateWorkOrder(r.Context(), updateParams)
	if err != nil {
		log.Printf("Error updating work order %d: %v", workOrderId, err)
		http.Error(w, "Failed to update work order", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(map[string]string{"message": "Work order updated successfully"})
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from UpdateWorkOrderHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}

	log.Printf("Work order %d updated successfully", workOrderId)
}

func (h *WorkOrderHandler) UpdateWorkOrderStatusHandler(w http.ResponseWriter, r *http.Request) {
	param := chi.URLParam(r, "order_id")
	workOrderId, err := strconv.Atoi(param)
	if err != nil {
		log.Printf("Error parsing work order number: %v", err)
		http.Error(w, "Invalid work order number", http.StatusBadRequest)
		return
	}

	var updateParams db.UpdateWorkOrderStatusParams
	if err := json.NewDecoder(r.Body).Decode(&updateParams); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	updateParams.ID = int64(workOrderId)
	err = h.queries.UpdateWorkOrderStatus(r.Context(), updateParams)
	if err != nil {
		log.Printf("Error updating work order status %d: %v", workOrderId, err)
		http.Error(w, "Failed to update work order status", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(map[string]string{"message": "Work order updated successfully"})
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from UpdateWorkOrderStatusHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}

	log.Printf("Work order status for %d updated successfully", workOrderId)
}

func (h *WorkOrderHandler) DeleteWorkOrderHandler(w http.ResponseWriter, r *http.Request) {
	param := chi.URLParam(r, "order_id")
	workOrderId, err := strconv.Atoi(param)
	if err != nil {
		log.Printf("Error parsing work order number: %v", err)
		http.Error(w, "Invalid work order number", http.StatusBadRequest)
		return
	}

	err = h.queries.DeleteWorkOrder(r.Context(), int64(workOrderId))
	if err != nil {
		log.Printf("Error deleting work order %d: %v", workOrderId, err)
		http.Error(w, "Failed to delete work order", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(map[string]string{"message": "Work order deleted successfully"})
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from DeleteWorkOrderHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}

// Using this for testing, gonna comment out for PR
// func (h *WorkOrderHandler) CreateManyWorkOrdersHandler(w http.ResponseWriter, r *http.Request) {
// 	var req struct {
// 		Count int32 `json:"count"`
// 	}

// 	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 		http.Error(w, "Invalid request body", http.StatusBadRequest)
// 		return
// 	}

// 	if req.Count <= 0 {
// 		http.Error(w, "Count must be greater than 0", http.StatusBadRequest)
// 		return
// 	}
// 	_, err := h.queries.CreateManyWorkOrdersForTesting(r.Context(), req.Count)
// 	if err != nil {
// 		http.Error(w, "Failed to create work orders", http.StatusInternalServerError)
// 		return
// 	}

// 	w.WriteHeader(http.StatusCreated)
// 	json.NewEncoder(w).Encode(map[string]string{
// 		"message": fmt.Sprintf("Successfully created %d work orders", req.Count),
// 	})
// }
