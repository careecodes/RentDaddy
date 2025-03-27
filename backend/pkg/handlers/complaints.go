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

func (h ComplaintHandler) ListComplaintsHandler(w http.ResponseWriter, r *http.Request) {
	props := db.ListComplaintsParams{
		Limit:  10,
		Offset: 0,
	}

	complaints, err := h.queries.ListComplaints(r.Context(), props)
	log.Println("complaints", complaints)
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

func (h ComplaintHandler) CreateComplaintHandler(w http.ResponseWriter, r *http.Request) {
	var params db.CreateComplaintParams

	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	Complaint, err := h.queries.CreateComplaint(r.Context(), params)
	if err != nil {
		log.Printf("Error creating complaint: %v", err)
		http.Error(w, "Failed to create complaint", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(Complaint)
	if err != nil {
		log.Printf("Error marshalling complaint: %v", err)
		http.Error(w, "Failed to encode complaint", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from CreateComplaintHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}

func (h *ComplaintHandler) UpdateComplaintHandler(w http.ResponseWriter, r *http.Request) {
	param := chi.URLParam(r, "complaint")
	ComplaintId, err := strconv.Atoi(param)
	if err != nil {
		log.Printf("Error parsing complaint number: %v", err)
		http.Error(w, "Invalid complaint number", http.StatusBadRequest)
		return
	}

	var updateParams db.UpdateComplaintParams
	if err := json.NewDecoder(r.Body).Decode(&updateParams); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	updateParams.ID = int64(ComplaintId)
	err = h.queries.UpdateComplaint(r.Context(), updateParams)
	if err != nil {
		log.Printf("Error updating complaint %d: %v", ComplaintId, err)
		http.Error(w, "Failed to update complaint", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(map[string]string{"message": "complaint updated successfully"})
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from UpdateComplaintHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}

	log.Printf("complaint %d updated successfully", ComplaintId)
}

func (h *ComplaintHandler) DeleteComplaintHandler(w http.ResponseWriter, r *http.Request) {
	param := chi.URLParam(r, "complaint")
	ComplaintId, err := strconv.Atoi(param)
	if err != nil {
		log.Printf("Error parsing complaint number: %v", err)
		http.Error(w, "Invalid complaint number", http.StatusBadRequest)
		return
	}

	err = h.queries.DeleteComplaint(r.Context(), int64(ComplaintId))
	if err != nil {
		log.Printf("Error deleting complaint %d: %v", ComplaintId, err)
		http.Error(w, "Failed to delete complaint", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(map[string]string{"message": "complaint deleted successfully"})
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from DeleteComplaintHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}

func (h *ComplaintHandler) UpdateComplaintStatusHandler(w http.ResponseWriter, r *http.Request) {
	param := chi.URLParam(r, "complaint_id")
	complaintId, err := strconv.Atoi(param)
	if err != nil {
		log.Printf("Error parsing complaint number: %v", err)
		http.Error(w, "Invalid complaint number", http.StatusBadRequest)
		return
	}

	var updateParams db.UpdateComplaintStatusParams
	if err := json.NewDecoder(r.Body).Decode(&updateParams); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	updateParams.ID = int64(complaintId)
	err = h.queries.UpdateComplaintStatus(r.Context(), updateParams)
	if err != nil {
		log.Printf("Error updating complaint status %d: %v", complaintId, err)
		http.Error(w, "Failed to update complaint status", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(map[string]string{"message": "Complaint updated successfully"})
	if err != nil {
		log.Printf("Error marshalling response: %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from UpdateComplaintStatusHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}

	log.Printf("Work order status for %d updated successfully", complaintId)
}
