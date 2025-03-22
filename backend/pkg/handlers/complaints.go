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
		Offset: 0,
	}

	complaints, err := queries.ListComplaints(ctx,props)
	log.Println("complaints",complaints)
	if err != nil {
		log.Println("error:", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	ret := db.CreateComplaintParams{
		ComplaintNumber: 1 + int64(1),
		Status:      db.StatusOpen,
		Description: "test",
		Category: db.ComplaintCategoryInternet,
		CreatedBy:    int64(1),
		UnitNumber:  101 + int16(1),
		Title:       "Test complaint",
	}


	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(ret)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (h *ComplaintHandler) CreateComplaintHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries){

	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[PARKING_HANDLER] Failed reading body: %v", err)
		http.Error(w, "Error reading body", http.StatusInternalServerError)
		return
	}

	var complaint db.CreateComplaintParams
	err = json.Unmarshal(body, &complaint)
	if err != nil {
		log.Printf("[Complaint handler] Failed parsing JSON: %v", err)
		http.Error(w, "Error parsing JSON", http.StatusInternalServerError)
		return
	}

	//TODO: JJ implement create logic once clerk user in db
	// ctx := context.Background()


	// var params db.CreateComplaintParams


	// if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
	// 	log.Printf("Error decoding request body: %v", err,)
	// 	http.Error(w, "Invalid request payload", http.StatusBadRequest)
	// 	return
	// }


	// complaint, err := queries.CreateComplaint(ctx,params)
	// if err != nil {
	// 	http.Error(w, "Failed to create complaint",http.StatusInternalServerError)
	// 	return
	// }

	w.WriteHeader(http.StatusCreated)
	err = json.NewEncoder(w).Encode(complaint)
	if err != nil {
		http.Error(w, "Failed to create complaint", http.StatusInternalServerError)
		return
	}
}

func (h *ComplaintHandler) DeleteComplaintHandler(w http.ResponseWriter, r *http.Request, queries *db.Queries){
	param := chi.URLParam(r, "complaint")

	complaint, err := strconv.Atoi(param)
	if err != nil {
		log.Printf("Error parsing complaint number: %v", err)
		http.Error(w, "Invalid complaint number", http.StatusBadRequest)
		return
	}

	err = h.queries.DeleteComplaint(r.Context(), int64(complaint))
	if err != nil {
		log.Printf("Error deleting complaint %d: %v", complaint, err)
		http.Error(w, "Failed to delete work order", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(map[string]string{"message": "Complaint deleted successfully"})
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