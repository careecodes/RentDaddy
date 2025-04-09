package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/middleware"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LockerHandler struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}
type BatchUnlockRequest struct {
	LockerIds []int32 `json:"locker_ids"`
}

type BatchDeleteRequest struct {
	LockerIds []int32 `json:"locker_ids"`
}

type NewLockerRequest struct {
	UserClerkId string `json:"user_clerk_id"`
	AccessCode  string `json:"access_code"`
}

type UpdateLockerAccessCode struct {
	AccessCode string `json:"access_code"`
}

// Need the pointers to handle the case where the field is not provided.
type UpdateLockerRequest struct {
	UserID     *string `json:"user_id,omitempty"`
	AccessCode *string `json:"access_code,omitempty"`
	InUse      *bool   `json:"in_use,omitempty"`
}

func NewLockerHandler(pool *pgxpool.Pool, queries *db.Queries) *LockerHandler {
	return &LockerHandler{
		pool:    pool,
		queries: queries,
	}
}

func (l LockerHandler) TestCreateLocker(w http.ResponseWriter, r *http.Request) {
	var req struct {
		AccessCode string `json:"access_code"`
		UserID     int64  `json:"user_id,omitempty"`
		Status     string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	createParams := db.CreateLockerParams{
		AccessCode: pgtype.Text{String: req.AccessCode, Valid: true},
		UserID:     pgtype.Int8{Int64: req.UserID, Valid: true},
	}

	locker := l.queries.CreateLocker(r.Context(), createParams)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(locker)
}

func (l LockerHandler) GetLockers(w http.ResponseWriter, r *http.Request) {
	lockers, err := l.queries.GetLockers(r.Context())
	if err != nil {
		log.Printf("Error getting lockers: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lockers)
}

func (l LockerHandler) GetLocker(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		log.Printf("Error parsing locker ID: %v", err)
		http.Error(w, "Invalid locker ID", http.StatusBadRequest)
		return
	}

	locker, err := l.queries.GetLocker(r.Context(), id)
	if err != nil {
		log.Printf("Error getting locker: %v", err)
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(locker)
}

func (l LockerHandler) GetLockersByUserId(w http.ResponseWriter, r *http.Request) {
	tenantCtx := middleware.GetUserCtx(r)
	if tenantCtx == nil {
		log.Printf("[LOCKER_HANDLER] Failed getting tenant context")
		http.Error(w, "Error no user context", http.StatusUnauthorized)
		return
	}

	var tenantMetadata ClerkUserPublicMetaData
	if err := json.Unmarshal(tenantCtx.PublicMetadata, &tenantMetadata); err != nil {
		log.Printf("[LOCKER_HANDLER] Failed parsing metadata: %v", err)
		http.Error(w, "Error parsing metadata", http.StatusInternalServerError)
		return
	}
	// log.Printf("TENANTS DB_ID: %d", tenantMetadata.DbId)

	lockers, err := l.queries.GetLockersByUserId(r.Context(), pgtype.Int8{Int64: int64(tenantMetadata.DbId), Valid: true})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			w.WriteHeader(http.StatusOK)
			return
		}
		log.Printf("Error getting locker by user ID: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lockers)
}

func (l LockerHandler) TenantUnlockLockers(w http.ResponseWriter, r *http.Request) {
	tenantCtx := middleware.GetUserCtx(r)
	if tenantCtx == nil {
		log.Printf("[LOCKER_HANDLER] Failed getting tenant context")
		http.Error(w, "Error no tenant context", http.StatusUnauthorized)
		return
	}

	var tenantMetadata ClerkUserPublicMetaData
	if err := json.Unmarshal(tenantCtx.PublicMetadata, &tenantMetadata); err != nil {
		log.Printf("[LOCKER_HANDLER] Failed parsing tenant metadata: %v", err)
		http.Error(w, "Error parsing tenant metadata", http.StatusInternalServerError)
		return
	}

	if err := l.queries.UnlockUserLockers(r.Context(), pgtype.Int8{Int64: int64(tenantMetadata.DbId), Valid: true}); err != nil {
		log.Printf("[LOCKER_HANDLER] Failed opening tenent's locker: %v", err)
		http.Error(w, "Error opening locker", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("success"))
}

func (l LockerHandler) UnlockLocker(w http.ResponseWriter, r *http.Request) {
	lockerIdStr := chi.URLParam(r, "id")
	lockerId, err := strconv.Atoi(lockerIdStr)
	if err != nil {
		log.Printf("[LOCKER_HANDLER] Failed locker Id invalid: %v", err)
		http.Error(w, "Error locker id invalid", http.StatusBadRequest)
	}

	var req struct {
		AccessCode string `json:"access_code"`
		InUse      bool   `json:"in_use"`
		UserID     int64  `json:"user_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	locker, err := l.queries.GetLocker(r.Context(), int64(lockerId))
	if err != nil {
		log.Printf("Error getting locker: %v", err)
		http.Error(w, "Could not find locker for user", http.StatusNotFound)
		return
	}

	// Verifies that the code matches to unlock
	if locker.AccessCode.String != req.AccessCode {
		http.Error(w, "Invalid access code", http.StatusUnauthorized)
		return
	}

	// Reset locker to default state for next Tenant
	err = l.queries.UpdateLockerUser(r.Context(), db.UpdateLockerUserParams{
		ID:     locker.ID,
		UserID: pgtype.Int8{}, // Clear user ID
		InUse:  false,         // Set not in use
	})
	if err != nil {
		log.Printf("Error resetting locker: %v", err)
		http.Error(w, "Could not reset locker", http.StatusInternalServerError)
		return
	}

	err = l.queries.UpdateAccessCode(r.Context(), db.UpdateAccessCodeParams{
		ID:         locker.ID,
		AccessCode: pgtype.Text{String: "", Valid: false},
	})
	if err != nil {
		log.Printf("Error resetting locker: %v", err)
		http.Error(w, "Could not reset locker", http.StatusInternalServerError)
		return
	}

	err = l.queries.UpdateAccessCode(r.Context(), db.UpdateAccessCodeParams{
		ID:         locker.ID,
		AccessCode: pgtype.Text{String: "", Valid: false},
	})

	if err != nil {
		log.Printf("Error resetting locker: %v", err)
		http.Error(w, "Could not reset locker", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode("Locker unlocked successfully")
}

func (l LockerHandler) AddPackage(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[LOCKER_HANDLER] Failed reading body: %v", err)
		http.Error(w, "Error reading body", http.StatusInternalServerError)
		return
	}

	var newLocker NewLockerRequest
	if err := json.Unmarshal(body, &newLocker); err != nil {
		log.Printf("[LOCKER_HANDLER] Failed reading JSON: %v", err)
		http.Error(w, "Error reading JSON", http.StatusBadRequest)
		return
	}

	clerkUser, err := user.Get(r.Context(), newLocker.UserClerkId)
	if err != nil {
		log.Printf("[LOCKER_HANDLER] Failed getting user Clerk data: %v", err)
		http.Error(w, "Error querying user Clerk data", http.StatusNotFound)
		return
	}

	var tenantMetadata ClerkUserPublicMetaData
	if err := json.Unmarshal(clerkUser.PublicMetadata, &tenantMetadata); err != nil {
		log.Printf("[LOCKER_HANDLER] Failed parsing user metadata: %v", err)
		http.Error(w, "Error parsing user metadata", http.StatusInternalServerError)
		return
	}

	availableLocker, err := l.queries.GetAvailableLocker(r.Context())
	if err != nil {
		log.Printf("[LOCKER_HANDLER] Failed query for an available locker: %v", err)
		http.Error(w, "Error getting an available locker", http.StatusConflict)
		return
	}

	err = l.queries.UpdateLockerInUse(r.Context(), db.UpdateLockerInUseParams{
		ID:         availableLocker.ID,
		UserID:     pgtype.Int8{Int64: int64(tenantMetadata.DbId), Valid: true},
		AccessCode: pgtype.Text{String: newLocker.AccessCode, Valid: true},
	})
	if err != nil {
		log.Printf("[LOCKER_HANDLER] Failed updating available locker: %v", err)
		http.Error(w, "Error updating available locker", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("success"))

	// if err := l.queries.CreateLocker(r.Context(), db.CreateLockerParams{
	// 	AccessCode: pgtype.Text{String: newLocker.AccessCode, Valid: true},
	// 	UserID:     pgtype.Int8{Int64: int64(tenantMetadata.DbId), Valid: true},
	// }); err != nil {
	// 	log.Printf("[LOCKER_HANDLER] Failed creating new locker: %v", err)
	// 	http.Error(w, "Error creating new locker", http.StatusInternalServerError)
	// 	return
	// }
	//
	// w.WriteHeader(http.StatusCreated)
	// w.Write([]byte("successfully created new locker"))
}

func (l LockerHandler) UpdateLockerAccessCode(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		log.Printf("Error parsing locker ID: %v", err)
		http.Error(w, "Invalid locker ID", http.StatusBadRequest)
		return
	}

	var req UpdateLockerAccessCode
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.AccessCode == "" {
		log.Printf("Failed no access code provided: %v", err)
		http.Error(w, "Error no access code provided", http.StatusInternalServerError)
		return
	}

	err = l.queries.UpdateAccessCode(r.Context(), db.UpdateAccessCodeParams{
		ID:         id,
		AccessCode: pgtype.Text{String: req.AccessCode, Valid: true},
	})
	if err != nil {
		log.Printf("Error updating access code: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("successfully updated access code"))
}

// This can handle updating the userId, access code, and the inUse status separately and together.
func (l LockerHandler) UpdateLocker(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		log.Printf("Error parsing locker ID: %v", err)
		http.Error(w, "Invalid locker ID", http.StatusBadRequest)
		return
	}

	var req UpdateLockerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Handles user and / or status update
	var userID pgtype.Int8
	if req.UserID == nil {
		// If there is no userId the field is invalid
		userID = pgtype.Int8{Valid: false}
	} else {
		// Get the user's DB ID from Clerk ID
		user, err := l.queries.GetUser(r.Context(), *req.UserID)
		if err != nil {
			log.Printf("Error getting user by clerk_id: %v", err)
			http.Error(w, "Invalid user ID", http.StatusBadRequest)
			return
		}
		userID = pgtype.Int8{Int64: user.ID, Valid: true}
	}

	inUse := true
	if req.InUse != nil {
		inUse = *req.InUse
	}

	err = l.queries.UpdateLockerUser(r.Context(), db.UpdateLockerUserParams{
		ID:     id,
		UserID: userID,
		InUse:  inUse,
	})
	if err != nil {
		log.Printf("Error updating locker user: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Handles access code update
	if req.AccessCode != nil {
		err = l.queries.UpdateAccessCode(r.Context(), db.UpdateAccessCodeParams{
			ID:         id,
			AccessCode: pgtype.Text{String: *req.AccessCode, Valid: true},
		})
		if err != nil {
			log.Printf("Error updating access code: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Locker updated successfully",
	})
}

// This is the function that we are using to create all the lockers based off the given number in the Apartment setup page.
func (l LockerHandler) CreateManyLockers(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Count int32 `json:"count"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Count <= 0 || req.Count > 100 {
		log.Printf("Invalid count: %v", req.Count)
		http.Error(w, "Count must be between 1 and 100", http.StatusBadRequest)
		return
	}

	rowsAffected, err := l.queries.CreateManyLockers(r.Context(), req.Count)
	if err != nil {
		log.Printf("Error creating many lockers: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int64{
		"lockers_created": rowsAffected,
	})
}

func (l LockerHandler) BatchDeleteLockers(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Failed reading body: %v", err)
		http.Error(w, "Error reading body", http.StatusInternalServerError)
		return
	}

	var lockerIds BatchDeleteRequest
	if err := json.Unmarshal(body, &lockerIds); err != nil {
		log.Printf("Failed parsing JSON: %v", err)
		http.Error(w, "Error parsing JSON", http.StatusBadRequest)
		return
	}
	if err = l.queries.DeleteLockersByIds(r.Context(), lockerIds.LockerIds); err != nil {
		log.Printf("Failed batch deleting lockers: %v", err)
		http.Error(w, "Error batch deleteing", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (l LockerHandler) BatchUnlockLockers(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Failed reading body: %v", err)
		http.Error(w, "Error reading body", http.StatusInternalServerError)
		return
	}

	var lockerIds BatchUnlockRequest
	if err := json.Unmarshal(body, &lockerIds); err != nil {
		log.Printf("Failed parsing JSON: %v", err)
		http.Error(w, "Error parsing JSON", http.StatusBadRequest)
		return
	}

	// TODO: queries batch unlock lockers
	if err = l.queries.UnlockerLockersByIds(r.Context(), lockerIds.LockerIds); err != nil {
		log.Printf("Failed batch update lockers: %v", err)
		http.Error(w, "Error batch update", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// For the Admin Dashboard Card that shows the number of lockers in use
func (l LockerHandler) GetNumberOfLockersInUse(w http.ResponseWriter, r *http.Request) {
	count, err := l.queries.GetNumberOfLockersInUse(r.Context())
	if err != nil {
		log.Printf("Error getting number of lockers in use: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int64{
		"lockers_in_use": count,
	})
}
