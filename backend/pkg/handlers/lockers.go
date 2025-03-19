package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LockerHandler struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

type UpdateLockerRequest struct {
    UserID     *int64 `json:"user_id,omitempty"`
    InUse      *bool  `json:"in_use,omitempty"`
    AccessCode *string `json:"access_code,omitempty"`
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
		UserID     *int64 `json:"user_id,omitempty"`
		Status     string `json:"status"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	createParams := db.CreateLockerParams{
		AccessCode: pgtype.Text{String: req.AccessCode, Valid: true},
		UserID:    pgtype.Int8{Valid: false},
		InUse:     false,
	}

	locker := l.queries.CreateLocker(r.Context(), createParams)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(locker)
}

func (l LockerHandler) GetLockers(w http.ResponseWriter, r *http.Request) {
	// limitStr := r.URL.Query().Get("limit")
	// offsetStr := r.URL.Query().Get("offset")

	// limit := int32(20)
	// if limitStr != "" {
	// 	if parsedLimit, err := strconv.ParseInt(limitStr, 10, 32); err == nil {
	// 		limit = int32(parsedLimit)
	// 	}
	// }

	// offset := int32(0)
	// if offsetStr != "" {
	// 	if parsedOffset, err := strconv.ParseInt(offsetStr, 10, 32); err == nil {
	// 		offset = int32(parsedOffset)
	// 	}
	// }

	lockers, err := l.queries.GetLockers(r.Context(), db.GetLockersParams{})
	if err != nil {
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
		http.Error(w, "Invalid locker ID", http.StatusBadRequest)
		return
	}
	
	locker, err := l.queries.GetLocker(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(locker)
}

// This can handle updating the userId, access code, and the inUse status separately and together.
func (l LockerHandler) UpdateLocker(w http.ResponseWriter, r *http.Request) {
    idStr := chi.URLParam(r, "id")
    id, err := strconv.ParseInt(idStr, 10, 64)
    if err != nil {
        http.Error(w, "Invalid locker ID", http.StatusBadRequest)
        return
    }

    var req UpdateLockerRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Handles user and / or status update
    if req.UserID != nil || req.InUse != nil {
        var userID pgtype.Int8
        if req.UserID == nil {
			// If there is no userId the field is invalid
            userID = pgtype.Int8{Valid: false}
        } else {
			// If there is a userId, it is stored and valid.
            userID = pgtype.Int8{Int64: *req.UserID, Valid: true}
        }

		// inUse is false by default, but takes in a value if given
        inUse := false
        if req.InUse != nil {
            inUse = *req.InUse
        }

        err = l.queries.UpdateLockerUser(r.Context(), db.UpdateLockerUserParams{
            ID:     id,
            UserID: userID,
            InUse:  inUse,
        })
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
    }

    // Handles access code update
    if req.AccessCode != nil {
        err = l.queries.UpdateAccessCode(r.Context(), db.UpdateAccessCodeParams{
            ID:         id,
            AccessCode: pgtype.Text{String: *req.AccessCode, Valid: true},
        })
        if err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }
    }

    w.WriteHeader(http.StatusOK)
}

// This is the function that we are using to create all the lockers based off the given number in the Apartment setup page.
func (l LockerHandler) CreateManyLockers(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Count int32 `json:"count"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Count <= 0 || req.Count > 100 {
		http.Error(w, "Count must be between 1 and 100", http.StatusBadRequest)
		return
	}

	rowsAffected, err := l.queries.CreateManyLockers(r.Context(), req.Count)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]int64{
		"lockers_created": rowsAffected,
	})
}