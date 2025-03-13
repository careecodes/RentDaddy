package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func GetTenantByClerkId(w http.ResponseWriter, r *http.Request, quries *db.Queries) {
	userClerkId := r.URL.Query().Get("clerk_id")

	res, err := quries.GetTenantByClerkID(r.Context(), userClerkId)
	if err != nil {
		log.Printf("[USER_HANDLER] Get tenant by ClerkId failed: %v", err)
		http.Error(w, "Faild querying user data", http.StatusInternalServerError)
		return
	}

	jsonResponse, err := json.Marshal(res)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed converting JSON: %v", err)
		http.Error(w, "Faild converting JSON", http.StatusInternalServerError)
		return
	}

	// w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonResponse))
	w.WriteHeader(200)
}

func GetAdminByClerkId(w http.ResponseWriter, r *http.Request, quries *db.Queries) {
	userClerkId := r.URL.Query().Get("clerk_id")

	res, err := quries.GetAdminByClerkID(r.Context(), userClerkId)
	if err != nil {
		log.Printf("[USER_HANDLER] Error Get admin by ClerkId failed: %v", err)
		http.Error(w, "Faild querying user data", http.StatusInternalServerError)
		return
	}

	jsonResponse, err := json.Marshal(res)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed converting JSON: %v", err)
		http.Error(w, "Faild converting JSON", http.StatusInternalServerError)
		return
	}

	// w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonResponse))
	w.WriteHeader(200)
}

func UpdateTenantProfile(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool, quries *db.Queries) {
	userClerkId := r.URL.Query().Get("clerk_id")

	tx, err := pool.BeginTx(r.Context(), pgx.TxOptions{})
	if err != nil {
		log.Printf("[USER_HANDLER] Error DB transaction failed: %v", err)
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}
}
