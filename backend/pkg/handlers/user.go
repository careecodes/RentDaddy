package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"time"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/middleware"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/invitation"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SetupAdminRequest struct {
	ClerkID string `json:"clerk_id"`
}
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
	tenantCtx := middleware.GetUserCtx(r)
	if tenantCtx == nil {
		log.Printf("[USER_HANDLER] Failed no tenant context")
		http.Error(w, "Error no tenant context", http.StatusUnauthorized)
		return
	}

	// userClerkId := r.URL.Query().Get("clerk_id")
	res, err := u.queries.GetUser(r.Context(), tenantCtx.ID)
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

	complaints, err := u.queries.ListComplaints(r.Context())
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
	var fullLeases []db.Lease
	for _, row := range leases {
		fullLeases = append(fullLeases, db.Lease{
			ID:              row.ID,
			LeaseNumber:     row.LeaseNumber,
			ExternalDocID:   row.ExternalDocID,
			LeasePdfS3:      row.LeasePdfS3,
			TenantID:        row.TenantID,
			LandlordID:      row.LandlordID,
			ApartmentID:     row.ApartmentID,
			LeaseStartDate:  row.LeaseStartDate,
			LeaseEndDate:    row.LeaseEndDate,
			RentAmount:      row.RentAmount,
			Status:          row.Status,
			CreatedBy:       row.CreatedBy,
			UpdatedBy:       row.UpdatedBy,
			PreviousLeaseID: row.PreviousLeaseID,
		})
	}

	adminOverview := &AdminOverviewRequest{
		WorkeOrders: workOrders,
		Complaints:  complaints,
		Leases:      fullLeases,
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
	tenants, err := u.queries.ListTenantsWithLeases(r.Context())
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

func (u UserHandler) GetTenantWorkOrders(w http.ResponseWriter, r *http.Request) {
	tenantClerkId := chi.URLParam(r, "clerk_id")
	if tenantClerkId == "" {
		log.Printf("[USER_HANDLER] Failed no tenant clerk id provided")
		http.Error(w, "Error no tenant clerk id provided", http.StatusBadRequest)
		return
	}

	tenantClerkData, err := user.Get(r.Context(), tenantClerkId)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed getting tenant from Clerk")
		http.Error(w, "Error getting tenant from Clerk", http.StatusBadRequest)
		return
	}

	var tenantMetadata ClerkUserPublicMetaData
	err = json.Unmarshal(tenantClerkData.PublicMetadata, &tenantMetadata)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing JSON: %v", err)
		http.Error(w, "Error parsing JSON", http.StatusInternalServerError)
		return
	}

	workOrders, err := u.queries.ListTenantWorkOrders(r.Context(), int64(tenantMetadata.DbId))
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
	tenantClerkId := chi.URLParam(r, "clerk_id")
	if tenantClerkId == "" {
		log.Printf("[USER_HANDLER] Failed no tenant clerk id provided")
		http.Error(w, "Error no tenant clerk id provided", http.StatusBadRequest)
		return
	}

	tenantClerkData, err := user.Get(r.Context(), tenantClerkId)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed getting tenant from Clerk")
		http.Error(w, "Error getting tenant from Clerk", http.StatusBadRequest)
		return
	}

	var tenantMetadata ClerkUserPublicMetaData
	err = json.Unmarshal(tenantClerkData.PublicMetadata, &tenantMetadata)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing JSON: %v", err)
		http.Error(w, "Error parsing JSON", http.StatusInternalServerError)
		return
	}

	complaints, err := u.queries.ListTenantComplaints(r.Context(), int64(tenantMetadata.DbId))
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying tenant complaints: %v", err)
		http.Error(w, "Error querying tenant complaints", http.StatusInternalServerError)
		return
	}

	jsonComplaints, err := json.Marshal(complaints)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying documents for tenant: %v", err)
		http.Error(w, "Error querying documents for tenant", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonComplaints))
}

func (u UserHandler) DeleteTenant(w http.ResponseWriter, r *http.Request) {
	tenantClerkId := chi.URLParam(r, "clerk_id")
	if tenantClerkId == "" {
		log.Printf("[USER_HANDLER] Failed no tenant clerk ID provided")
		http.Error(w, "Error No tenant Clerk ID", http.StatusBadRequest)
		return
	}

	res, err := user.Delete(r.Context(), tenantClerkId)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed getting tenant from Clerk")
		http.Error(w, "Error getting tenant from Clerk", http.StatusBadRequest)
		return
	}

	if res.Response.StatusCode != http.StatusOK {
		log.Printf("[USER_HANDLER] Failed deleting tenant from Clerk")
		http.Error(w, "Error deleting tenant from Clerk", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// ADMIN END

// TENANT START
func (u UserHandler) TenantGetDocuments(w http.ResponseWriter, r *http.Request) {
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

func (u UserHandler) TenantGetWorkOrders(w http.ResponseWriter, r *http.Request) {
	tenantCtx := middleware.GetUserCtx(r)
	if tenantCtx == nil {
		log.Printf("[USER_HANDLER] Failed no tenant context")
		http.Error(w, "Error no tenant context", http.StatusUnauthorized)
		return
	}

	var tenantMetadata ClerkUserPublicMetaData
	err := json.Unmarshal(tenantCtx.PublicMetadata, &tenantMetadata)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing JSON: %v", err)
		http.Error(w, "Error parsing JSON", http.StatusInternalServerError)
		return
	}

	workOrders, err := u.queries.ListTenantWorkOrders(r.Context(), int64(tenantMetadata.DbId))
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

func (u UserHandler) TenantGetComplaints(w http.ResponseWriter, r *http.Request) {
	tenantCtx := middleware.GetUserCtx(r)
	if tenantCtx == nil {
		log.Printf("[USER_HANDLER] Failed no tenant context")
		http.Error(w, "Error no tenant context", http.StatusUnauthorized)
		return
	}

	var tenantMetadata ClerkUserPublicMetaData
	err := json.Unmarshal(tenantCtx.PublicMetadata, &tenantMetadata)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing JSON: %v", err)
		http.Error(w, "Error parsing JSON", http.StatusInternalServerError)
		return
	}

	complaints, err := u.queries.ListTenantComplaints(r.Context(), int64(tenantMetadata.DbId))
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying tenant complaints: %v", err)
		http.Error(w, "Error querying tenant complaints", http.StatusInternalServerError)
		return
	}

	jsonComplaints, err := json.Marshal(complaints)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying documents for tenant: %v", err)
		http.Error(w, "Error querying documents for tenant", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonComplaints))
}

func (u UserHandler) TenantCreateComplaint(w http.ResponseWriter, r *http.Request) {
	tenantCtx := middleware.GetUserCtx(r)
	if tenantCtx == nil {
		log.Printf("[USER_HANDLER] Failed no tenant context")
		http.Error(w, "Error no tenant context", http.StatusUnauthorized)
		return
	}

	var tenantMetadata ClerkUserPublicMetaData
	err := json.Unmarshal(tenantCtx.PublicMetadata, &tenantMetadata)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing JSON: %v", err)
		http.Error(w, "Error parsing JSON", http.StatusInternalServerError)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed reading body: %s", err)
		http.Error(w, "Error reading body", http.StatusInternalServerError)
		return
	}

	var createComplaintReq db.CreateComplaintParams
	err = json.Unmarshal(body, &createComplaintReq)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing JSON: %s", err)
		http.Error(w, "Error parsing JSON", http.StatusInternalServerError)
		return
	}
	log.Printf("NEW COMPLAINT TITLE: %s", createComplaintReq.Title)
	log.Printf("NEW COMPLAINT CATEGORY: %s", createComplaintReq.Category)

	res, err := u.queries.CreateComplaint(r.Context(), db.CreateComplaintParams{
		CreatedBy:   int64(tenantMetadata.DbId),
		Category:    createComplaintReq.Category,
		Title:       createComplaintReq.Title,
		Description: createComplaintReq.Description,
		UnitNumber:  pgtype.Int8{Int64: createComplaintReq.UnitNumber.Int64, Valid: true},
	})
	if err != nil {
		log.Printf("[USER_HANDLER] Failed creating tenant complaint: %v", err)
		http.Error(w, "Error creating tenant complaint", http.StatusInternalServerError)
		return
	}

	jsonComplaints, err := json.Marshal(res)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed querying documents for tenant: %v", err)
		http.Error(w, "Error querying documents for tenant", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonComplaints))
}

func (u UserHandler) TenantGetApartment(w http.ResponseWriter, r *http.Request) {
	tenantCtx := middleware.GetUserCtx(r)
	if tenantCtx == nil {
		log.Printf("[USER_HANDLER] Failed no tenant context")
		http.Error(w, "Error no tenant context", http.StatusUnauthorized)
		return
	}

	var tenantMetadata ClerkUserPublicMetaData
	err := json.Unmarshal(tenantCtx.PublicMetadata, &tenantMetadata)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing JSON: %v", err)
		http.Error(w, "Error parsing JSON", http.StatusInternalServerError)
		return
	}

	res, err := u.queries.GetApartment(r.Context(), int64(tenantMetadata.DbId))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			w.WriteHeader(http.StatusNoContent)
		}
		log.Printf("[USER_HANDLER] Failed querying tenant apartment: %v", err)
		http.Error(w, "Error querying apartment", http.StatusInternalServerError)
		return
	}

	jsonApartment, err := json.Marshal(res)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed converting to JSON: %v", err)
		http.Error(w, "Error converting to JSON", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonApartment))
}

func (u UserHandler) TenantCreateWorkOrder(w http.ResponseWriter, r *http.Request) {
	tenantCtx := middleware.GetUserCtx(r)
	if tenantCtx == nil {
		log.Printf("[USER_HANDLER] Failed no tenant context")
		http.Error(w, "Error no tenant context", http.StatusUnauthorized)
		return
	}

	var tenantMetadata ClerkUserPublicMetaData
	err := json.Unmarshal(tenantCtx.PublicMetadata, &tenantMetadata)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing JSON: %v", err)
		http.Error(w, "Error parsing JSON", http.StatusInternalServerError)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed reading body: %s", err)
		http.Error(w, "Error reading body", http.StatusInternalServerError)
		return
	}

	var createWorkOrderReq db.CreateWorkOrderParams
	err = json.Unmarshal(body, &createWorkOrderReq)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed parsing JSON: %s", err)
		http.Error(w, "Error parsing JSON request", http.StatusInternalServerError)
		return
	}
	log.Printf("Category: %s", createWorkOrderReq.Category)
	log.Printf("Title: %s", createWorkOrderReq.Title)
	log.Printf("Createdby: %d", tenantMetadata.DbId)

	res, err := u.queries.CreateWorkOrder(r.Context(), db.CreateWorkOrderParams{
		CreatedBy:   int64(tenantMetadata.DbId),
		Category:    createWorkOrderReq.Category,
		Title:       createWorkOrderReq.Title,
		Description: createWorkOrderReq.Description,
		UnitNumber:  createWorkOrderReq.UnitNumber,
	})
	if err != nil {
		log.Printf("[USER_HANDLER] Failed creating tenant work_order: %v", err)
		http.Error(w, "Error creating work_order complaint", http.StatusInternalServerError)
		return
	}

	jsonWorkOrders, err := json.Marshal(res)
	if err != nil {
		log.Printf("[USER_HANDLER] Failed converting JSON: %v", err)
		http.Error(w, "Error converting JSON", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(jsonWorkOrders))
}

// TENANT END
func (u UserHandler) SetupAdminUser(w http.ResponseWriter, r *http.Request) {
	log.Println("==== [ADMIN_SETUP] SetupAdminUser handler called ====")

	// Log headers for debugging auth issues
	for name, values := range r.Header {
		if name != "Authorization" && name != "Cookie" {
			log.Printf("[ADMIN_SETUP] Header %s: %v", name, values)
		} else {
			log.Printf("[ADMIN_SETUP] Header %s: [present]", name)
		}
	}

	// Read and log the request body
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[ADMIN_SETUP] Failed to read request body: %v", err)
		http.Error(w, "Failed to read request", http.StatusBadRequest)
		return
	}

	// Restore the body for further processing
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	log.Printf("[ADMIN_SETUP] Request body: %s", string(bodyBytes))

	var payload SetupAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		log.Printf("[ADMIN_SETUP] Failed to decode JSON payload: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	log.Printf("[ADMIN_SETUP] Parsed payload: clerk_id=%s", payload.ClerkID)

	ctx := r.Context()

	// Always fetch Clerk user first
	clerkUser, err := user.Get(ctx, payload.ClerkID)
	if err != nil {
		log.Printf("[SETUP] Failed to fetch Clerk user: %v", err)
		http.Error(w, "Invalid Clerk ID", http.StatusBadRequest)
		return
	}

	// Extract primary email
	primaryEmail := ""
	for _, email := range clerkUser.EmailAddresses {
		if clerkUser.PrimaryEmailAddressID != nil && email.ID == *clerkUser.PrimaryEmailAddressID {
			primaryEmail = email.EmailAddress
			break
		}
	}
	if primaryEmail == "" && len(clerkUser.EmailAddresses) > 0 {
		primaryEmail = clerkUser.EmailAddresses[0].EmailAddress
	}

	// Parse public metadata from Clerk
	var metadata ClerkUserPublicMetaData
	if err := json.Unmarshal(clerkUser.PublicMetadata, &metadata); err != nil {
		log.Printf("[SETUP] Failed parsing Clerk metadata: %v", err)
		http.Error(w, "Invalid Clerk metadata", http.StatusBadRequest)
		return
	}

	// Check if an admin already exists in the DB
	admins, err := u.queries.ListUsersByRole(ctx, db.RoleAdmin)
	log.Printf("[ADMIN_SETUP] Checking for existing admins: found %d, error: %v", len(admins), err)

	// Get admin email from environment variables
	adminEmail := os.Getenv("ADMIN_EMAIL")

	// Check if we can proceed with this admin setup
	isAllowedAdmin := false

	// Case 1: No admins exist yet, anyone can become the first admin
	if err == nil && len(admins) == 0 {
		isAllowedAdmin = true
		log.Printf("[ADMIN_SETUP] No admins exist yet, allowing setup for: %s", primaryEmail)
	} else if adminEmail != "" && primaryEmail == adminEmail {
		// Case 2: Admins exist, but this user is identified as an admin via env var
		isAllowedAdmin = true
		log.Printf("[ADMIN_SETUP] Email matches ADMIN_EMAIL env var: %s", primaryEmail)
	} else if adminEmail == "" {
		// Case 3: Admins exist, try SMTP_FROM as fallback
		smtpFrom := os.Getenv("SMTP_FROM")
		if smtpFrom != "" && primaryEmail == smtpFrom {
			isAllowedAdmin = true
			log.Printf("[ADMIN_SETUP] Email matches SMTP_FROM env var: %s", primaryEmail)
		}
	}

	if !isAllowedAdmin && len(admins) > 0 {
		log.Printf("[ADMIN_SETUP] Admin already exists (%d found) and override not allowed", len(admins))
		http.Error(w, "Admin already seeded", http.StatusConflict)
		return
	}

	// Check if the intended db_id already exists
	if _, err := u.queries.GetUserByID(ctx, int64(metadata.DbId)); err == nil {
		log.Printf("[SETUP] db_id %d already exists in DB", metadata.DbId)
		http.Error(w, "db_id already in use", http.StatusConflict)
		return
	}

	// Insert the admin into the DB using provided db_id
	log.Printf("[ADMIN_SETUP] Attempting to insert admin: ClerkID=%s, Name=%s %s, Email=%s",
		clerkUser.ID, deref(clerkUser.FirstName), deref(clerkUser.LastName), primaryEmail)

	admin, err := u.queries.InsertAdminWithID(ctx, db.InsertAdminWithIDParams{
		ID:        int64(metadata.DbId),
		ClerkID:   clerkUser.ID,
		FirstName: deref(clerkUser.FirstName),
		LastName:  deref(clerkUser.LastName),
		Email:     primaryEmail,
		Role:      db.RoleAdmin,
	})
	if err != nil {
		log.Printf("[ADMIN_SETUP] Failed to insert admin into DB: %v", err)
		http.Error(w, "Failed to insert admin", http.StatusInternalServerError)
		return
	}

	log.Printf("[ADMIN_SETUP] Successfully inserted admin with ID=%d", admin.ID)

	// Update Clerk metadata if needed
	meta := ClerkUserPublicMetaData{
		DbId: int32(admin.ID),
		Role: db.RoleAdmin,
	}
	metaBytes, _ := json.Marshal(meta)
	metaRawMessage := json.RawMessage(metaBytes)
	_, err = user.Update(ctx, clerkUser.ID, &user.UpdateParams{
		PublicMetadata: &metaRawMessage,
	})
	if err != nil {
		log.Printf("[SETUP] Failed to update Clerk metadata: %v", err)
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("Admin seeded successfully"))
}

// deref returns the string value of a pointer or "" if nil
func deref(s *string) string {
	if s != nil {
		return *s
	}
	return ""
}

// SeedingState tracks the progress of seeding operations
type SeedingState struct {
	InProgress   bool   `json:"in_progress"`
	LastError    string `json:"last_error,omitempty"`
	LastComplete string `json:"last_complete,omitempty"`
	StartedAt    string `json:"started_at,omitempty"`
}

// Package-level variables to track seeding status
var (
	usersSeedingState = SeedingState{InProgress: false}
	usersSeedingMutex sync.Mutex
	dataSeedingState  = SeedingState{InProgress: false}
	dataSeedingMutex  sync.Mutex
)

func (u UserHandler) AdminSeedUsers(w http.ResponseWriter, r *http.Request) {
	log.Println("[SEED_USERS] User seeding process initiated by admin")

	// Set CORS headers immediately to ensure they're sent even if the operation times out
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

	// Check if seeding is already in progress
	usersSeedingMutex.Lock()
	if usersSeedingState.InProgress {
		resp := map[string]string{
			"status":  "in_progress",
			"message": "User seeding is already in progress",
		}
		usersSeedingMutex.Unlock()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(resp)
		return
	}

	// Mark seeding as in progress with timestamp
	now := time.Now()
	usersSeedingState.InProgress = true
	usersSeedingState.LastError = ""
	usersSeedingState.StartedAt = now.Format(time.RFC3339)
	usersSeedingMutex.Unlock()

	// Start the seeding process asynchronously
	go func() {
		defer func() {
			usersSeedingMutex.Lock()
			usersSeedingState.InProgress = false
			usersSeedingState.LastComplete = time.Now().Format(time.RFC3339)
			usersSeedingMutex.Unlock()
		}()

		// Use the newer seed_users_with_clerk script instead of the outdated seedusers script
		cmd := exec.Command("go", "run", "-mod=mod",
			"/app/scripts/cmd/seed_users_with_clerk/main.go",
			"/app/scripts/cmd/seed_users_with_clerk/seed_users.go")
		cmd.Dir = "/app" // ECS container working directory

		// Set SCRIPT_MODE=true to ensure proper operation in non-interactive context
		cmd.Env = append(os.Environ(), "SCRIPT_MODE=true")
		output, err := cmd.CombinedOutput()

		if err != nil {
			errMsg := err.Error()
			if len(output) > 0 {
				errMsg += ": " + string(output)
			}

			log.Printf("[SEED_USERS] Failed: %v\nOutput: %s", err, string(output))

			usersSeedingMutex.Lock()
			usersSeedingState.LastError = errMsg
			usersSeedingMutex.Unlock()
			return
		}

		log.Println("[SEED_USERS] User seeding completed successfully")

		// After user seeding completes, automatically run data seeding
		log.Println("[SEED_USERS] Starting automatic data seeding for work orders and complaints")

		dataSeedingMutex.Lock()
		dataSeedingState.InProgress = true
		dataSeedingState.LastError = ""
		dataSeedingState.StartedAt = time.Now().Format(time.RFC3339)
		dataSeedingMutex.Unlock()

		// Run the data seeding process
		dataCmd := exec.Command("go", "run", "-mod=mod",
			"/app/scripts/cmd/complaintswork/main.go",
			"/app/scripts/cmd/complaintswork/complaintsAndWork.go")
		dataCmd.Dir = "/app"
		dataCmd.Env = append(os.Environ(), "SCRIPT_MODE=true")
		dataOutput, dataErr := dataCmd.CombinedOutput()

		dataSeedingMutex.Lock()
		dataSeedingState.InProgress = false
		dataSeedingState.LastComplete = time.Now().Format(time.RFC3339)

		if dataErr != nil {
			dataErrMsg := dataErr.Error()
			if len(dataOutput) > 0 {
				dataErrMsg += ": " + string(dataOutput)
			}
			log.Printf("[SEED_DATA] Failed: %v\nOutput: %s", dataErr, string(dataOutput))
			dataSeedingState.LastError = dataErrMsg
		} else {
			log.Println("[SEED_DATA] Data seeding completed successfully")
		}
		dataSeedingMutex.Unlock()
	}()

	// Return immediately with a success message
	resp := map[string]string{
		"status":  "started",
		"message": "User and data seeding process started",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted) // 202 Accepted indicates the request has been accepted for processing
	json.NewEncoder(w).Encode(resp)
}

func (u UserHandler) AdminSeedData(w http.ResponseWriter, r *http.Request) {
	log.Println("[SEED_DATA] Triggered by admin")

	// Set CORS headers immediately to ensure they're sent even if the operation times out
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

	// Check if seeding is already in progress
	dataSeedingMutex.Lock()
	if dataSeedingState.InProgress {
		resp := map[string]string{
			"status":  "in_progress",
			"message": "Data seeding is already in progress",
		}
		dataSeedingMutex.Unlock()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(resp)
		return
	}

	// Mark seeding as in progress with timestamp
	now := time.Now()
	dataSeedingState.InProgress = true
	dataSeedingState.LastError = ""
	dataSeedingState.StartedAt = now.Format(time.RFC3339)
	dataSeedingMutex.Unlock()

	// Start the seeding process asynchronously
	go func() {
		defer func() {
			dataSeedingMutex.Lock()
			dataSeedingState.InProgress = false
			dataSeedingState.LastComplete = time.Now().Format(time.RFC3339)
			dataSeedingMutex.Unlock()
		}()

		cmd := exec.Command("go", "run", "-mod=mod",
			"/app/scripts/cmd/complaintswork/main.go",
			"/app/scripts/cmd/complaintswork/complaintsAndWork.go")
		cmd.Dir = "/app"
		output, err := cmd.CombinedOutput()

		if err != nil {
			errMsg := err.Error()
			if len(output) > 0 {
				errMsg += ": " + string(output)
			}

			log.Printf("[SEED_DATA] Failed: %v\nOutput: %s", err, string(output))

			dataSeedingMutex.Lock()
			dataSeedingState.LastError = errMsg
			dataSeedingMutex.Unlock()
			return
		}

		log.Println("[SEED_DATA] Seeding complete successfully")
	}()

	// Return immediately with a success message
	resp := map[string]string{
		"status":  "started",
		"message": "Complaints and work orders seeding started",
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted) // 202 Accepted indicates the request has been accepted for processing
	json.NewEncoder(w).Encode(resp)
}

// AuthenticatedCheckAdminExists is a wrapper for CheckAdminExists that ensures
// it's being called within the authenticated middleware chain
func (u UserHandler) AuthenticatedCheckAdminExists(w http.ResponseWriter, r *http.Request) {
	log.Println("==== [CHECK_ADMIN] AuthenticatedCheckAdminExists endpoint called ====")

	// Since this endpoint is behind the ClerkAuthMiddleware, authentication has
	// already been verified, and the user context is already available.
	// The middleware will have returned a 401 error if authentication failed.

	// Just log the authenticated user for debugging
	if clerkUser := middleware.GetUserCtx(r); clerkUser != nil {
		log.Printf("[CHECK_ADMIN] Authenticated endpoint used by: ClerkID=%s", clerkUser.ID)
	}

	// Call the main handler which will detect the authenticated context
	u.CheckAdminExists(w, r)
}

func (u UserHandler) CheckAdminExists(w http.ResponseWriter, r *http.Request) {
	log.Println("==== [CHECK_ADMIN] CheckAdminExists endpoint called ====")
	ctx := r.Context()

	// Get admin email from environment
	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = os.Getenv("SMTP_FROM")
	}

	// 1. First check if there are any admin users in the database
	admins, err := u.queries.ListUsersByRole(ctx, db.RoleAdmin)
	if err != nil {
		log.Printf("[CHECK_ADMIN] DB error listing admins: %v", err)
		http.Error(w, "Error checking admin", http.StatusInternalServerError)
		return
	}

	log.Printf("[CHECK_ADMIN] Found %d admins in the database", len(admins))

	// 2. If any admins exist, first try to find one matching ADMIN_EMAIL environment variable
	var selectedAdmin db.User
	var firstAdminEmail string
	var adminFound bool

	if len(admins) > 0 {
		// First try to find admin matching the environment variable email
		if adminEmail != "" {
			for _, admin := range admins {
				if admin.Email == adminEmail {
					log.Printf("[CHECK_ADMIN] Found admin matching ADMIN_EMAIL/SMTP_FROM: ID=%d, Email=%s",
						admin.ID, admin.Email)
					selectedAdmin = db.User{
						ID:        admin.ID,
						Email:     admin.Email,
						FirstName: admin.FirstName,
						LastName:  admin.LastName,
						Role:      admin.Role,
					}
					firstAdminEmail = admin.Email
					adminFound = true
					break
				}
			}
		}

		// If no match with environment variable, use first admin in the list
		if !adminFound {
			selectedAdmin = db.User{
				ID:        admins[0].ID,
				Email:     admins[0].Email,
				FirstName: admins[0].FirstName,
				LastName:  admins[0].LastName,
				Role:      admins[0].Role,
			}
			firstAdminEmail = admins[0].Email
			log.Printf("[CHECK_ADMIN] Using first admin found: ID=%d, Email=%s",
				selectedAdmin.ID, selectedAdmin.Email)
		}
	}

	// 3. Check if the current authenticated user matches admin criteria
	var currentUserEmail, currentUserClerkID string
	var shouldBeAdmin bool

	// Try to get authenticated user from request context
	clerkUser := middleware.GetUserCtx(r)

	if clerkUser != nil {
		log.Printf("[CHECK_ADMIN] Authenticated user found in request context")

		// Extract user information
		currentUserClerkID = clerkUser.ID

		// Get primary email
		for _, email := range clerkUser.EmailAddresses {
			if clerkUser.PrimaryEmailAddressID != nil && email.ID == *clerkUser.PrimaryEmailAddressID {
				currentUserEmail = email.EmailAddress
				break
			}
		}
		if currentUserEmail == "" && len(clerkUser.EmailAddresses) > 0 {
			currentUserEmail = clerkUser.EmailAddresses[0].EmailAddress
		}

		log.Printf("[CHECK_ADMIN] Authenticated user: ClerkID=%s, Email=%s",
			currentUserClerkID, currentUserEmail)

		// FIRST: Check for admin role in Clerk metadata
		var userMetaData middleware.ClerkUserPublicMetaData
		if err := json.Unmarshal(clerkUser.PublicMetadata, &userMetaData); err == nil {
			if userMetaData.Role == db.RoleAdmin {
				shouldBeAdmin = true
				log.Printf("[CHECK_ADMIN] Current user has admin role in Clerk metadata")
			} else {
				log.Printf("[CHECK_ADMIN] Current user role in Clerk: %v (not admin)", userMetaData.Role)
			}
		} else {
			log.Printf("[CHECK_ADMIN] Couldn't parse Clerk metadata, error: %v", err)
		}

		// FALLBACK: If role check fails, check email against environment variables
		if !shouldBeAdmin {
			log.Printf("[CHECK_ADMIN] No admin role found in Clerk metadata, falling back to email checks")
			// Check if this user's email matches admin email from environment
			if adminEmail != "" && currentUserEmail == adminEmail {
				shouldBeAdmin = true
				log.Printf("[CHECK_ADMIN] Current user (%s) matches ADMIN_EMAIL/SMTP_FROM", currentUserEmail)
			} else {
				// Fallback checks based on name
				adminFirst := os.Getenv("ADMIN_FIRST_NAME")
				adminLast := os.Getenv("ADMIN_LAST_NAME")

				if adminFirst != "" && adminLast != "" &&
					*clerkUser.FirstName == adminFirst &&
					*clerkUser.LastName == adminLast {
					shouldBeAdmin = true
					log.Printf("[CHECK_ADMIN] Current user (%s) matches ADMIN_FIRST_NAME/ADMIN_LAST_NAME", currentUserEmail)
				} else if currentUserEmail == "ezra@gitfor.ge" {
					// Legacy support for hardcoded email
					shouldBeAdmin = true
					log.Printf("[CHECK_ADMIN] Current user is using legacy admin email")
				}
			}

			// Special case: if current user matches admin email but not in admin list
			if shouldBeAdmin && len(admins) > 0 && !adminFound && currentUserEmail == adminEmail {
				// Override the selected admin to be the one with matching email
				log.Printf("[CHECK_ADMIN] Current user email matches admin email but isn't first in DB. Prioritizing this user.")
				selectedAdmin = db.User{
					Email: currentUserEmail,
					ID:    0, // We don't know the ID yet
				}
				firstAdminEmail = currentUserEmail
			}
		}
	} else {
		// Handling for unauthenticated requests (like from taskfile)
		log.Printf("[CHECK_ADMIN] No authenticated user found - handling as task/script execution")

		// Use admin email from environment variables for creating admin
		if adminEmail != "" {
			// For unauthenticated requests, use the email from environment variables
			currentUserEmail = adminEmail
			log.Printf("[CHECK_ADMIN] Using ADMIN_EMAIL/SMTP_FROM env var as current user email: %s", currentUserEmail)

			// Set flag to indicate this email should be admin
			shouldBeAdmin = true

			// If we're creating a new admin, we'll need more info
			adminFirst := os.Getenv("ADMIN_FIRST_NAME")
			adminLast := os.Getenv("ADMIN_LAST_NAME")

			if adminFirst == "" || adminLast == "" {
				log.Printf("[CHECK_ADMIN] Warning: ADMIN_FIRST_NAME and/or ADMIN_LAST_NAME not set")
				log.Printf("[CHECK_ADMIN] Using default values for admin user details")
			} else {
				log.Printf("[CHECK_ADMIN] Using env vars for admin details: %s %s <%s>",
					adminFirst, adminLast, adminEmail)
			}
		} else {
			log.Printf("[CHECK_ADMIN] Warning: No ADMIN_EMAIL or SMTP_FROM set for unauthenticated request")
		}
	}

	// 4. Check if we should auto-create admin in the response
	createAdminResponse := false
	if len(admins) == 0 && shouldBeAdmin {
		// For authenticated users, we need a Clerk ID
		// For unauthenticated requests from taskfile, we can proceed even without a Clerk ID
		if currentUserClerkID != "" || clerkUser == nil {
			createAdminResponse = true
			log.Printf("[CHECK_ADMIN] Suggesting admin creation for user: %s", currentUserEmail)
		}
	}

	tenants, err := u.queries.ListUsersByRole(ctx, db.RoleTenant)
	if err != nil {
		log.Printf("[CHECK_ADMIN] DB error listing tenants: %v", err)
		http.Error(w, "Error checking tenants", http.StatusInternalServerError)
		return
	}
	log.Printf("[CHECK_ADMIN] Found %d tenants in the database", len(tenants))

	// 5. Build and send response
	response := map[string]any{
		"admin_exists":       len(admins) > 0,
		"tenants_exist":      len(tenants) > 0,
		"create_admin":       createAdminResponse,
		"admin_clerk_id":     currentUserClerkID,
		"current_user_email": currentUserEmail,
	}

	// Add first admin info if exists
	if len(admins) > 0 {
		response["first_admin_email"] = firstAdminEmail
		response["first_admin_id"] = selectedAdmin.ID
	}

	log.Printf("[CHECK_ADMIN] Responding with: %+v", response)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetSeedingStatus returns the current status of seeding operations
func (u UserHandler) GetSeedingStatus(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

	// Get current status
	usersSeedingMutex.Lock()
	userStatus := usersSeedingState
	usersSeedingMutex.Unlock()

	dataSeedingMutex.Lock()
	dataStatus := dataSeedingState
	dataSeedingMutex.Unlock()

	status := map[string]interface{}{
		"user_seeding": userStatus,
		"data_seeding": dataStatus,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(status)
}
