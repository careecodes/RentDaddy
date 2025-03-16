package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ComplaintHandler struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewComplaintHandler(pool *pgxpool.Pool, queries *db.Queries) *ComplaintHandler {
	return &ComplaintHandler{
		pool:    pool,
		queries: queries,
	}
}

func (h *ComplaintHandler) GetComplaintHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries) {
	param := chi.URLParam(r, "complaints")
	complaintNumber, err := strconv.Atoi(param)
	if err != nil {
		http.Error(w, "Invalid complaint number", http.StatusBadRequest)
		return
	}

	complaint, err := queries.GetComplaint(r.Context(), int64(complaintNumber))
	if err != nil {
		http.Error(w, "Complaint not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(complaint)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (h *ComplaintHandler) ListComplaintsHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries){
	ctx := context.Background()

	props := db.ListComplaintsParams{
		Limit: 10,
	}

	complaints, err := queries.ListComplaints(ctx,props)
	log.Println("complaints",complaints)
	if err != nil {
		log.Println("error:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(complaints)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (h *ComplaintHandler) CreateComplaintHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries){
	ctx := context.Background()

	var params db.CreateComplaintParams
	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		http.Error(w, "Invalid request payload",http.StatusBadRequest)
		return
	}

	complaint, err := queries.CreateComplaint(ctx,params)
	if err != nil {
		http.Error(w, "Failed to create complaint",http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	err = json.NewEncoder(w).Encode(complaint)
	if err != nil {
		http.Error(w, "Failed to create complaint", http.StatusInternalServerError)
		return
	}
}