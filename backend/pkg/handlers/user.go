package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/middleware"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/invitation"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AdminOverviewRequest struct {
	WorkeOrders []db.WorkOrder `json:"work_orders"`
	Complaints  []db.Complaint `json:"complaints"`
	Leases      []db.Lease     `json:"tenants"`
}

type InviteUserRequest struct {
	Email string `json:"email"`
}

type TenantUpdateProfileRequest struct {
	ClerkID               string `json:"clerk_id"`
	FirstName             string `json:"first_name"`
	LastName              string `json:"last_name"`
	Phone                 string `json:"phone"`
	PrimaryEmail          string `json:"primary_email"`
	PrimaryEmailAddressId string `json:"primary_enmail_id"`
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

// PUBLIC START
func (u UserHandler) GetUserByClerkId(w http.ResponseWriter, r *http.Request) {
	userClerkId := r.URL.Query().Get("clerk_id")
	res, err := u.queries.GetUser(r.Context(), userClerkId)
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

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonRes))
}

// PUBLIC END

// ADMIN START
func (u UserHandler) InviteTenant(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed reading body: %v", err)
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}

	var tenantPayload InviteUserRequest
	if err := json.Unmarshal(body, &tenantPayload); err != nil {
		log.Printf("[USER_HANDLER] Failed to parse JSON payload: %v", err)
		http.Error(w, "Error JSON payload", http.StatusBadRequest)
		return
	}

	// log.Printf("user ctx ID: %d\n", adminCtx.ID)
	invite, err := invitation.Create(r.Context(), &invitation.CreateParams{
		EmailAddress:   tenantPayload.Email,
		IgnoreExisting: clerk.Bool(true),
	})

	if invite.Response != nil && invite.Response.StatusCode == http.StatusOK {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Successfully invited user"))
		return
	}

	log.Printf("[USER_HANDLER] Failed inviting tenant: %v", err)
	http.Error(w, "Error inviting tenant", http.StatusInternalServerError)
}

func (u UserHandler) InviteAdmin(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed reading body: %v", err)
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}

	var adminPayload InviteUserRequest
	if err := json.Unmarshal(body, &adminPayload); err != nil {
		log.Printf("[USER_HANDLER] Failed to parse JSON payload: %v", err)
		http.Error(w, "Error JSON payload", http.StatusBadRequest)
		return
	}

	adminCtx := middleware.GetUserCtx(r)
	if adminCtx == nil {
		log.Println("[PARKING_HANDLER] Failed no user context")
		http.Error(w, "Error no user context", http.StatusUnauthorized)
		return
	}

	// log.Printf("user ctx ID: %d\n", adminCtx.ID)

	publicMetadata := &ClerkUserPublicMetaData{
		Role: db.RoleAdmin,
	}
	publicMetadataBytes, err := json.Marshal(publicMetadata)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed converting tenants metadata to JSON: %v", err)
		http.Error(w, "Error converting metadata to JSON", http.StatusInternalServerError)
		return
	}

	publicMetadataRawJson := json.RawMessage(publicMetadataBytes)
	invite, err := invitation.Create(r.Context(), &invitation.CreateParams{
		EmailAddress:   adminPayload.Email,
		PublicMetadata: &publicMetadataRawJson,
		IgnoreExisting: clerk.Bool(true),
	})

	if invite.Response != nil && invite.Response.StatusCode == http.StatusOK {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Successfully invited user"))
		return
	}

	log.Printf("[USER_HANDLER] Failed inviting tenant: %v", err)
	http.Error(w, "Error inviting tenant", http.StatusInternalServerError)
}

func (u UserHandler) GetAdminOverview(w http.ResponseWriter, r *http.Request) {
	leases, err := u.queries.ListLeases(r.Context())
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying tenants for adminOverview: %v", err)
		http.Error(w, "Error querying tenants", http.StatusInternalServerError)
		return
	}

	complaints, err := u.queries.ListComplaints(r.Context(), db.ListComplaintsParams{
		Limit:  5,
		Offset: 0,
	})
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying complaints for adminOverview: %v", err)
		http.Error(w, "Error querying complaints", http.StatusInternalServerError)
		return
	}

	workOrders, err := u.queries.ListWorkOrders(r.Context())
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying work_orders for adminOverview: %v", err)
		http.Error(w, "Faild querying user data", http.StatusInternalServerError)
		return
	}

	adminOverview := &AdminOverviewRequest{
		WorkeOrders: workOrders,
		Complaints:  complaints,
		Leases:      leases,
	}

	adminOverviewData, err := json.Marshal(adminOverview)
	if err != nil {
		log.Printf("[USER_HANDLER] Get tenant by ClerkId failed: %v", err)
		http.Error(w, "Faild querying user data", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(adminOverviewData))
}

func (u UserHandler) GetAllTenants(w http.ResponseWriter, r *http.Request) {
	tenants, err := u.queries.ListUsersByRole(r.Context(), db.RoleTenant)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed getting tenants: %v", err)
		http.Error(w, "Failed getting tenants", http.StatusInternalServerError)
		return

	}

	jsonRes, err := json.Marshal(tenants)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing tenants to JSON: %v", err)
		http.Error(w, "Failed parsing to JSON", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonRes))
}

func (u UserHandler) GetTenantEmailAddresses(w http.ResponseWriter, r *http.Request) {
	tenantsClerkId := chi.URLParam(r, "clerk_id")
	tenantEmailAddresses := make([]EmailEntry, 0)

	clerkRes, err := user.Get(r.Context(), tenantsClerkId)
	if err != nil || clerkRes.Response.StatusCode != http.StatusOK {
		log.Printf("[USER_HANDLER] Failed querying clerk user data: %v", err)
		http.Error(w, "Error querying clerk user data", http.StatusInternalServerError)
		return
	}

	for _, email := range clerkRes.EmailAddresses {
		tenantEmailAddresses = append(tenantEmailAddresses, EmailEntry{Id: email.ID, EmailAddress: email.EmailAddress, Verification: EmailVerification{Status: email.Verification.Status, Strategy: email.Verification.Strategy}})
	}

	jsonRes, err := json.Marshal(tenantEmailAddresses)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed converting to JSON: %v", err)
		http.Error(w, "Error converting to JSON", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonRes))
}

func (u UserHandler) UpdateTenantProfile(w http.ResponseWriter, r *http.Request) {
	userCtx := middleware.GetUserCtx(r)
	if userCtx == nil {
		log.Println("[PARKING_HANDLER] Failed no user context")
		http.Error(w, "Error no user context", http.StatusUnauthorized)
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed reading request body: %v", err)
		http.Error(w, "Error reading request body", http.StatusInternalServerError)
		return
	}

	var updatedUserInfo TenantUpdateProfileRequest
	err = json.Unmarshal(body, &updatedUserInfo)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing body to JSON: %v", err)
		http.Error(w, "Error parsing body to JSON", http.StatusInternalServerError)
		return
	}

	err = u.queries.UpdateUser(r.Context(), db.UpdateUserParams{
		ClerkID:   updatedUserInfo.ClerkID,
		FirstName: updatedUserInfo.FirstName,
		LastName:  updatedUserInfo.LastName,
		Email:     updatedUserInfo.PrimaryEmail,
		Phone:     pgtype.Text{String: updatedUserInfo.Phone, Valid: true},
	})
	if err != nil {
		log.Printf("[USER_HANDLER] Failed updating %s : %v", updatedUserInfo.ClerkID, err)
		http.Error(w, "Error database transaction", http.StatusInternalServerError)
		return
	}

	clerkRes, err := user.Update(r.Context(), updatedUserInfo.ClerkID, &user.UpdateParams{
		FirstName:             &updatedUserInfo.FirstName,
		LastName:              &updatedUserInfo.LastName,
		PrimaryEmailAddressID: &updatedUserInfo.PrimaryEmailAddressId,
	})
	if err != nil && clerkRes.Response.StatusCode != http.StatusOK {
		log.Printf("[USER_HANDLER] Failed updating Clerk data for %s : %v", updatedUserInfo.ClerkID, err)
		http.Error(w, "Error database transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Successfully updated tenant"))
}

// ADMIN END

// TENANT START
func (u UserHandler) GetTenantDocuments(w http.ResponseWriter, r *http.Request) {
	documents, err := u.queries.ListLeases(r.Context())
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying documents for tenant: %v", err)
		http.Error(w, "Error querying documents for tenant", http.StatusInternalServerError)
		return
	}

	jsonDocments, err := json.Marshal(documents)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying documents for tenant: %v", err)
		http.Error(w, "Error querying documents for tenant", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonDocments))
}

func (u UserHandler) GetTenantWorkOrders(w http.ResponseWriter, r *http.Request) {
	workOrders, err := u.queries.ListWorkOrders(r.Context())
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying work_orders for tenant: %v", err)
		http.Error(w, "Error querying work_orders for tenant", http.StatusInternalServerError)
		return
	}

	jsonWorkOrders, err := json.Marshal(workOrders)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying work_orders for tenant: %v", err)
		http.Error(w, "Error querying work_orders for tenant", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonWorkOrders))
}

func (u UserHandler) GetTenantComplaints(w http.ResponseWriter, r *http.Request) {
	complaints, err := u.queries.ListComplaints(r.Context(), db.ListComplaintsParams{
		Limit:  25,
		Offset: 0,
	})
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying complaints for tenant: %v", err)
		http.Error(w, "Error querying complaints for tenant", http.StatusInternalServerError)
		return
	}

	jsonComplaints, err := json.Marshal(complaints)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying complaints for tenant: %v", err)
		http.Error(w, "Error querying complaints for tenant", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonComplaints))
}

// TENANT END
