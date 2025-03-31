package handlers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"os/exec"

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
	var payload SetupAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

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
	if err == nil && len(admins) > 0 {
		// Allow only if this is the default admin
		if primaryEmail == "wrldconnect1@gmail.com" && metadata.DbId == 1 {
			log.Println("[SETUP] Default admin override accepted")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("Default admin recognized"))
			return
		}
		log.Println("[SETUP] Admin already exists and override not allowed")
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
	admin, err := u.queries.InsertAdminWithID(ctx, db.InsertAdminWithIDParams{
		ID:        int64(metadata.DbId),
		ClerkID:   clerkUser.ID,
		FirstName: deref(clerkUser.FirstName),
		LastName:  deref(clerkUser.LastName),
		Email:     primaryEmail,
		Role:      db.RoleAdmin,
	})
	if err != nil {
		log.Printf("[SETUP] Failed to insert admin into DB: %v", err)
		http.Error(w, "Failed to insert admin", http.StatusInternalServerError)
		return
	}

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
func (u UserHandler) AdminSeedUsers(w http.ResponseWriter, r *http.Request) {
	log.Println("[SEED_USERS] Triggered by admin")

	cmd := exec.Command("go", "run", "scripts/cmd/seedusers/main.go")
	cmd.Dir = "/app" // ECS container working directory
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("[SEED_USERS] Failed: %v\nOutput: %s", err, string(output))
		http.Error(w, "Failed to seed users", http.StatusInternalServerError)
		return
	}

	log.Println("[SEED_USERS] Seeding complete")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Users seeded successfully"))
}

func (u UserHandler) AdminSeedData(w http.ResponseWriter, r *http.Request) {
	log.Println("[SEED_DATA] Triggered by admin")

	cmd := exec.Command("go", "run", "scripts/cmd/complaintswork/main.go")
	cmd.Dir = "/app"
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("[SEED_DATA] Failed: %v\nOutput: %s", err, string(output))
		http.Error(w, "Failed to seed demo data", http.StatusInternalServerError)
		return
	}

	log.Println("[SEED_DATA] Seeding complete")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Complaints and work orders seeded"))
}

func (u UserHandler) CheckAdminExists(w http.ResponseWriter, r *http.Request) {
	admins, err := u.queries.ListUsersByRole(r.Context(), db.RoleAdmin)
	if err != nil {
		log.Printf("[CHECK_ADMIN] DB error: %v", err)
		http.Error(w, "Error checking admin", http.StatusInternalServerError)
		return
	}

	hasAdmin := len(admins) > 0
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"exists": hasAdmin})
}
