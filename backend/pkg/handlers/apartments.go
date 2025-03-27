package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ApartmentHandler struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewApartmentHandler(pool *pgxpool.Pool, queries *db.Queries) *ApartmentHandler {
	return &ApartmentHandler{
		pool:    pool,
		queries: queries,
	}
}

type UpdateApartmentParams struct {
	Price        pgtype.Numeric `json:"price"`
	ManagementID pgtype.Int8    `json:"management_id"`
	Availability bool           `json:"availability"`
	LeaseID      pgtype.Int8    `json:"lease_id"`
}

func (h ApartmentHandler) GetApartmentHandler(w http.ResponseWriter, r *http.Request) {
	param := chi.URLParam(r, "apartment")

	apartmentNumber, err := strconv.Atoi(param)
	if err != nil {
		log.Printf("Error parsing apartment number: %v", err)
		http.Error(w, "Invalid apartment number", http.StatusBadRequest)
		return
	}

	apartment, err := h.queries.GetApartment(r.Context(), int64(apartmentNumber))
	if err != nil {
		log.Printf("Error fetching apartment %d: %v", apartmentNumber, err)
		http.Error(w, "Apartment not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(apartment)
	if err != nil {
		log.Printf("Error marshalling apartment %v", err)
		http.Error(w, "Failed to encode apartment", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from GetApartmentHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}

func (h ApartmentHandler) ListApartmentsHandler(w http.ResponseWriter, r *http.Request) {
	apartments, err := h.queries.ListApartments(r.Context())
	if err != nil {
		log.Printf("Error fetching apartments: %v", err)
		http.Error(w, "Failed to fetch apartments", http.StatusInternalServerError)
		return
	}
	if len(apartments) == 0 {
		log.Printf("No apartments found: %v", err)
		http.Error(w, "No apartments found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(apartments)
	if err != nil {
		log.Printf("Error marshalling apartments %v", err)
		http.Error(w, "Failed to encode apartments", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from ListApartmentsHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}

func (h ApartmentHandler) CreateApartmentHandler(w http.ResponseWriter, r *http.Request) {
	var params db.CreateApartmentParams

	if err := json.NewDecoder(r.Body).Decode(&params); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	apartment, err := h.queries.CreateApartment(r.Context(), params)
	if err != nil {
		log.Printf("Error creating apartment: %v", err)
		http.Error(w, "Failed to create apartment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(apartment)
	if err != nil {
		log.Printf("Error marshalling apartment %v", err)
		http.Error(w, "Failed to encode apartment", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from CreateApartmentHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}

func (h ApartmentHandler) UpdateApartmentHandler(w http.ResponseWriter, r *http.Request) {
	param := chi.URLParam(r, "apartment_id")
	apartmentID, err := strconv.Atoi(param)
	if err != nil {
		log.Printf("Error parsing apartment number: %v", err)
		http.Error(w, "Invalid apartment number", http.StatusBadRequest)
		return
	}

	reqUpdate, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Unmarshal the request body into the UpdateApartmentParams struct
	var updateRequestParams UpdateApartmentParams
	if err := json.Unmarshal(reqUpdate, &updateRequestParams); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request payload", http.StatusBadRequest)
		return
	}

	updateParams := db.UpdateApartmentParams{
		ID:           int64(apartmentID),
		Price:        updateRequestParams.Price,
		ManagementID: updateRequestParams.ManagementID,
		Availability: updateRequestParams.Availability,
	}

	err = h.queries.UpdateApartment(r.Context(), updateParams)
	if err != nil {
		log.Printf("Error updating apartment %d: %v", apartmentID, err)
		http.Error(w, "Failed to update apartment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(updateParams)
	if err != nil {
		log.Printf("Error marshalling apartment %v", err)
		http.Error(w, "Failed to encode apartment", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from UpdateApartmentHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}

func (h ApartmentHandler) DeleteApartmentHandler(w http.ResponseWriter, r *http.Request) {
	param := chi.URLParam(r, "apartment_id")

	apartmentID, err := strconv.Atoi(param)
	if err != nil {
		log.Printf("Error parsing apartment number: %v", err)
		http.Error(w, "Invalid apartment number", http.StatusBadRequest)
		return
	}

	err = h.queries.DeleteApartment(r.Context(), int64(apartmentID))
	if err != nil {
		log.Printf("Error deleting apartment %d: %v", apartmentID, err)
		http.Error(w, "Failed to delete apartment", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	jsonRes, err := json.Marshal(map[string]string{fmt.Sprintf("apartment_%d", apartmentID): "deleted"})
	if err != nil {
		log.Printf("Error marshalling response %v", err)
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}

	_, err = w.Write(jsonRes)
	if err != nil {
		log.Printf("Error writing response from DeleteApartmentHandler: %v", err)
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}
