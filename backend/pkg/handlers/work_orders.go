package handlers

import (
	"context"
	"encoding/json"
	"io"
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

func (h *WorkOrderHandler) GetWorkOrderHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	param := chi.URLParam(r, "work_order")
	workOrderNumber, err := strconv.Atoi(param)
	if err != nil {
		http.Error(w, "Invalid work order number", http.StatusBadRequest)
		return
	}

	workOrder, err := queries.GetWorkOrder(r.Context(), int64(workOrderNumber))
	if err != nil {
		http.Error(w, "Work order not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(workOrder)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func ListWorkOrdersHandler(w http.ResponseWriter, queries *db.Queries) {
	ctx := context.Background()

	props := db.ListWorkOrdersParams{
		Limit:  1,
		Offset: 25,
	}
	workOrders, err := queries.ListWorkOrders(ctx, props)
	log.Println(workOrders)
	if err != nil {
		log.Println("error:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(workOrders)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func CreateWorkOrderHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	ctx := context.Background()

	var params db.CreateWorkOrderParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	workOrder, err := queries.CreateWorkOrder(ctx, params)
	if err != nil {
		http.Error(w, "Failed to create work order", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	err = json.NewEncoder(w).Encode(workOrder)
	if err != nil {
		http.Error(w, "Failed to create work order", http.StatusInternalServerError)
		return
	}
}

func UpdateWorkOrderHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read body", http.StatusBadRequest)
		return
	}

	var params db.UpdateWorkOrderParams
	if err := json.Unmarshal(body, &params); err != nil {
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}
	param := chi.URLParam(r, "work_order")
	workOrderNumber, err := strconv.Atoi(param)
	if err != nil {
		http.Error(w, "Invalid work order number", http.StatusBadRequest)
		return
	}
	params.ID = int64(workOrderNumber)
}

func DeleteWorkOrderHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	ctx := context.Background()
	param := chi.URLParam(r, "work_order")
	workOrderNumber, err := strconv.ParseInt(param, 10, 64)
	if err != nil {
		http.Error(w, "Invalid work order number", http.StatusBadRequest)
		return
	}

	err = queries.DeleteWorkOrder(ctx, workOrderNumber)
	if err != nil {
		http.Error(w, "Work order not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
}
