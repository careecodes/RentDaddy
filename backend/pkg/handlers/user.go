package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/internal/utils"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/invitation"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UpdateTenantProfileType struct {
	ClerkID      string         `json:"clerk_id"`
	FirstName    string         `json:"first_name"`
	LastName     string         `json:"last_name"`
	Email        string         `json:"email"`
	Phone        string         `json:"phone"`
	LeaseStatus  db.LeaseStatus `json:"lease_status"`
	LeaseEndDate time.Time      `json:"lease_end_date"`
}

type UserHandler struct {
	pool    *pgxpool.Pool
	queries *db.Queries
}

func NewUserHandler(pool *pgxpool.Pool, queries *db.Queries) *UserHandler {
	return &UserHandler{
		pool:    pool,
		queries: queries,
	}
}

func (u UserHandler) CreateTenant(w http.ResponseWriter, r *http.Request) {
	adminClerkId := r.URL.Query().Get("admin_clerk_id")
	frontendPort := os.Getenv("FRONTEND_PORT")
	if frontendPort == "" {
		log.Println("[ENV] No FRONTEND_PORT ENV provided")
		http.Error(w, "Error no FRONTEND_PORT provided", http.StatusBadRequest)
		return
	}

	tenantEmail := chi.URLParam(r, "tenant_email")
	tenantUnitNumberStr := chi.URLParam(r, "tenant_unit_number")

	if tenantEmail == "" {
		log.Println("[USER_HANDLER] Provide a valid tenant_email")
		http.Error(w, "Error no valid tenant email", http.StatusBadRequest)
		return
	}
	if tenantUnitNumberStr == "" {
		log.Println("[USER_HANDLER] Provide a valid unit_number")
		http.Error(w, "Error no valid unit_number", http.StatusBadRequest)
		return
	}

	tenantUnitInt, err := strconv.Atoi(tenantUnitNumberStr)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed converting tenants unit number to Int: %v", err)
		http.Error(w, "Error converting tenants unit number to Int", http.StatusBadRequest)
		return
	}

	publicMetadata := &ClerkUserPublicMetaData{
		UnitNumber:   tenantUnitInt,
		ManagementId: adminClerkId,
	}
	publicMetadataBytes, err := json.Marshal(publicMetadata)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed converting tenants metadata to RAW JSON: %v", err)
		http.Error(w, "Error converting metadata to JSON", http.StatusInternalServerError)
		return
	}
	publicMetadataRawJson := json.RawMessage(publicMetadataBytes)

	invite, err := invitation.Create(r.Context(), &invitation.CreateParams{
		EmailAddress:   tenantEmail,
		PublicMetadata: &publicMetadataRawJson,
		// NOTE: update URL
		RedirectURL:    clerk.String(utils.GetAbsoluteUrl("/auth/login")),
		IgnoreExisting: clerk.Bool(true), // If pending invite already out will re-invite them
	})

	if invite.Response.StatusCode == 200 {
		w.Write([]byte("Success"))
		w.WriteHeader(200)
		return
	}

	log.Printf("[USER_HANDLER] Failed inviting tenant: %v", err)
	http.Error(w, "Error inviting tenant", http.StatusInternalServerError)
}

func (u UserHandler) GetTenantByClerkId(w http.ResponseWriter, r *http.Request) {
	userClerkId := r.URL.Query().Get("clerk_id")

	res, err := u.queries.GetTenantByClerkID(r.Context(), userClerkId)
	if err != nil {
		log.Printf("[USER_HANDLER] Get tenant by ClerkId failed: %v", err)
		http.Error(w, "Faild querying user data", http.StatusInternalServerError)
		return
	}

	jsonRes, err := json.Marshal(res)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed converting JSON: %v", err)
		http.Error(w, "Faild converting JSON", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonRes))
	w.WriteHeader(200)
}

func (u UserHandler) GetAllUsers(w http.ResponseWriter, r *http.Request, typeOfUser db.Role) {
	limitStr := r.URL.Query().Get("limit")
	offsetStr := r.URL.Query().Get("offset")

	limit := 20
	if limitStr != "" {
		parsedLimit, err := strconv.Atoi(limitStr)
		if err == nil {
			limit = parsedLimit
		} else {
			log.Printf("[USER_HANDLER] Inavlid Limit value: %v", err)
		}
	}

	offset := 0
	if offsetStr != "" {
		parsedOffset, err := strconv.Atoi(offsetStr)
		if err == nil {
			offset = parsedOffset
		} else {
			log.Printf("[USER_HANDLER] Inavlid offset value: %v", err)
		}
	}

	res, err := u.queries.GetUsers(r.Context(), db.GetUsersParams{
		Role:   typeOfUser,
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		log.Printf("[USER_HANDLER] Failed getting tenants: %v", err)
		http.Error(w, "Failed getting tenants", http.StatusInternalServerError)
		return

	}

	jsonRes, err := json.Marshal(res)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing tenants to JSON: %v", err)
		http.Error(w, "Failed parsing to JSON", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonRes))
	w.WriteHeader(200)
}

func (u UserHandler) UpdateTenantCredentials(w http.ResponseWriter, r *http.Request) {
	userClerkId := r.URL.Query().Get("clerk_id")
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed reading request body: %v", err)
		http.Error(w, "Error reading request body", http.StatusInternalServerError)
		return
	}

	var updatePayload db.UpdateUserCredentialsParams
	updatePayload.ClerkID = userClerkId
	err = json.Unmarshal(body, &updatePayload)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing payload to JSON: %v", err)
		http.Error(w, "Error parsing payload to JSON", http.StatusInternalServerError)
		return
	}

	err = u.queries.UpdateUserCredentials(r.Context(), updatePayload)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed updating user credentials: %v", err)
		http.Error(w, "Error updating user credentials", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(200)
}

func (u UserHandler) GetAdminByClerkId(w http.ResponseWriter, r *http.Request) {
	userClerkId := chi.URLParam(r, "clerk_id")

	res, err := u.queries.GetAdminByClerkID(r.Context(), userClerkId)
	if err != nil {
		log.Printf("[USER_HANDLER] Error Get admin by clerk_id failed: %v", err)
		http.Error(w, "Error querying user data", http.StatusInternalServerError)
		return
	}

	jsonRes, err := json.Marshal(res)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed converting JSON: %v", err)
		http.Error(w, "Error converting JSON", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonRes))
	w.WriteHeader(200)
}

func UpdateTenantProfile(w http.ResponseWriter, r *http.Request, pool *pgxpool.Pool, quries *db.Queries) {
	userClerkId := r.URL.Query().Get("clerk_id")
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed reading request body: %v", err)
		http.Error(w, "Error reading request body", http.StatusInternalServerError)
		return
	}

	var updatedUserInfo UpdateTenantProfileType
	updatedUserInfo.ClerkID = userClerkId
	err = json.Unmarshal(body, &updatedUserInfo)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing body to JSON: %v", err)
		http.Error(w, "Error parsing body to JSON", http.StatusInternalServerError)
		return
	}

	tx, err := pool.Begin(r.Context())
	if err != nil {
		log.Printf("[USER_HANDLER] Failed instablishing a database transaction: %v", err)
		http.Error(w, "Error database transaction", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(r.Context())
	qtx := quries.WithTx(tx)

	err = qtx.UpdateUserCredentials(r.Context(), db.UpdateUserCredentialsParams{
		ClerkID:   updatedUserInfo.ClerkID,
		FirstName: updatedUserInfo.FirstName,
		LastName:  updatedUserInfo.LastName,
		Email:     updatedUserInfo.Email,
	})
	if err != nil {
		log.Printf("[USER_HANDLER] Failed updating user %s : %v", userClerkId, err)
		http.Error(w, "Error database transaction", http.StatusInternalServerError)
		return
	}
	// update lease table
	// NOTE: Need tenant_id in this
	_, err = qtx.RenewLease(r.Context(), db.RenewLeaseParams{
		LeaseEndDate: pgtype.Date{Time: updatedUserInfo.LeaseEndDate, Valid: true},
		// ???
		DocumentID: 0,
	})

	// updatedUserInfo.LeaseStatus
	// updatedUserInfo.LeaseEndDate
	tx.Commit(r.Context())
}
