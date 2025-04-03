// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.28.0
// source: leases.sql

package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

const createLease = `-- name: CreateLease :one
INSERT INTO leases (
  lease_number, external_doc_id, lease_pdf_s3,
  tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount,
  status, created_by, updated_by,
  previous_lease_id, tenant_signing_url, landlord_signing_url
) VALUES (
  $1, $2, $3,
  $4, $5, $6,
  $7, $8, $9,
  $10, $11, $12,
  $13, $14, $15
)
RETURNING id, lease_number, external_doc_id, lease_pdf_s3, tenant_id, landlord_id, apartment_id, lease_start_date, lease_end_date, rent_amount, status, created_by, updated_by, created_at, updated_at, previous_lease_id, tenant_signing_url, landlord_signing_url
`

type CreateLeaseParams struct {
	LeaseNumber        int64          `json:"lease_number"`
	ExternalDocID      string         `json:"external_doc_id"`
	LeasePdfS3         pgtype.Text    `json:"lease_pdf_s3"`
	TenantID           int64          `json:"tenant_id"`
	LandlordID         int64          `json:"landlord_id"`
	ApartmentID        int64          `json:"apartment_id"`
	LeaseStartDate     pgtype.Date    `json:"lease_start_date"`
	LeaseEndDate       pgtype.Date    `json:"lease_end_date"`
	RentAmount         pgtype.Numeric `json:"rent_amount"`
	Status             LeaseStatus    `json:"status"`
	CreatedBy          int64          `json:"created_by"`
	UpdatedBy          int64          `json:"updated_by"`
	PreviousLeaseID    pgtype.Int8    `json:"previous_lease_id"`
	TenantSigningUrl   pgtype.Text    `json:"tenant_signing_url"`
	LandlordSigningUrl pgtype.Text    `json:"landlord_signing_url"`
}

func (q *Queries) CreateLease(ctx context.Context, arg CreateLeaseParams) (Lease, error) {
	row := q.db.QueryRow(ctx, createLease,
		arg.LeaseNumber,
		arg.ExternalDocID,
		arg.LeasePdfS3,
		arg.TenantID,
		arg.LandlordID,
		arg.ApartmentID,
		arg.LeaseStartDate,
		arg.LeaseEndDate,
		arg.RentAmount,
		arg.Status,
		arg.CreatedBy,
		arg.UpdatedBy,
		arg.PreviousLeaseID,
		arg.TenantSigningUrl,
		arg.LandlordSigningUrl,
	)
	var i Lease
	err := row.Scan(
		&i.ID,
		&i.LeaseNumber,
		&i.ExternalDocID,
		&i.LeasePdfS3,
		&i.TenantID,
		&i.LandlordID,
		&i.ApartmentID,
		&i.LeaseStartDate,
		&i.LeaseEndDate,
		&i.RentAmount,
		&i.Status,
		&i.CreatedBy,
		&i.UpdatedBy,
		&i.CreatedAt,
		&i.UpdatedAt,
		&i.PreviousLeaseID,
		&i.TenantSigningUrl,
		&i.LandlordSigningUrl,
	)
	return i, err
}

const expireLeasesEndingToday = `-- name: ExpireLeasesEndingToday :one
WITH expired_leases AS (
    UPDATE leases
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND lease_end_date <= CURRENT_DATE
    RETURNING id
)
SELECT 
    COUNT(*) as expired_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'No leases expired today'
        WHEN COUNT(*) = 1 THEN '1 lease expired today'
        ELSE COUNT(*) || ' leases expired today'
    END as message
FROM expired_leases
`

type ExpireLeasesEndingTodayRow struct {
	ExpiredCount int64       `json:"expired_count"`
	Message      interface{} `json:"message"`
}

func (q *Queries) ExpireLeasesEndingToday(ctx context.Context) (ExpireLeasesEndingTodayRow, error) {
	row := q.db.QueryRow(ctx, expireLeasesEndingToday)
	var i ExpireLeasesEndingTodayRow
	err := row.Scan(&i.ExpiredCount, &i.Message)
	return i, err
}

const getActiveLeasesByTenant = `-- name: GetActiveLeasesByTenant :many
SELECT id, lease_number, external_doc_id, lease_pdf_s3, tenant_id, landlord_id, apartment_id, lease_start_date, lease_end_date, rent_amount, status, created_by, updated_by, created_at, updated_at, previous_lease_id, tenant_signing_url, landlord_signing_url FROM leases
WHERE tenant_id = $1
AND status IN ('active', 'draft', 'pending_approval')
ORDER BY id DESC
`

func (q *Queries) GetActiveLeasesByTenant(ctx context.Context, tenantID int64) ([]Lease, error) {
	rows, err := q.db.Query(ctx, getActiveLeasesByTenant, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Lease
	for rows.Next() {
		var i Lease
		if err := rows.Scan(
			&i.ID,
			&i.LeaseNumber,
			&i.ExternalDocID,
			&i.LeasePdfS3,
			&i.TenantID,
			&i.LandlordID,
			&i.ApartmentID,
			&i.LeaseStartDate,
			&i.LeaseEndDate,
			&i.RentAmount,
			&i.Status,
			&i.CreatedBy,
			&i.UpdatedBy,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.PreviousLeaseID,
			&i.TenantSigningUrl,
			&i.LandlordSigningUrl,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getConflictingActiveLease = `-- name: GetConflictingActiveLease :one
SELECT id, lease_number, external_doc_id, lease_pdf_s3,
  tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount,
  status, created_by, updated_by,
  previous_lease_id, tenant_signing_url,previous_lease_id
FROM leases
WHERE tenant_id = $1
  AND status = 'active'
  AND lease_start_date <= $3
  AND lease_end_date >= $2
LIMIT 1
`

type GetConflictingActiveLeaseParams struct {
	TenantID       int64       `json:"tenant_id"`
	LeaseEndDate   pgtype.Date `json:"lease_end_date"`
	LeaseStartDate pgtype.Date `json:"lease_start_date"`
}

type GetConflictingActiveLeaseRow struct {
	ID                int64          `json:"id"`
	LeaseNumber       int64          `json:"lease_number"`
	ExternalDocID     string         `json:"external_doc_id"`
	LeasePdfS3        pgtype.Text    `json:"lease_pdf_s3"`
	TenantID          int64          `json:"tenant_id"`
	LandlordID        int64          `json:"landlord_id"`
	ApartmentID       int64          `json:"apartment_id"`
	LeaseStartDate    pgtype.Date    `json:"lease_start_date"`
	LeaseEndDate      pgtype.Date    `json:"lease_end_date"`
	RentAmount        pgtype.Numeric `json:"rent_amount"`
	Status            LeaseStatus    `json:"status"`
	CreatedBy         int64          `json:"created_by"`
	UpdatedBy         int64          `json:"updated_by"`
	PreviousLeaseID   pgtype.Int8    `json:"previous_lease_id"`
	TenantSigningUrl  pgtype.Text    `json:"tenant_signing_url"`
	PreviousLeaseID_2 pgtype.Int8    `json:"previous_lease_id_2"`
}

func (q *Queries) GetConflictingActiveLease(ctx context.Context, arg GetConflictingActiveLeaseParams) (GetConflictingActiveLeaseRow, error) {
	row := q.db.QueryRow(ctx, getConflictingActiveLease, arg.TenantID, arg.LeaseEndDate, arg.LeaseStartDate)
	var i GetConflictingActiveLeaseRow
	err := row.Scan(
		&i.ID,
		&i.LeaseNumber,
		&i.ExternalDocID,
		&i.LeasePdfS3,
		&i.TenantID,
		&i.LandlordID,
		&i.ApartmentID,
		&i.LeaseStartDate,
		&i.LeaseEndDate,
		&i.RentAmount,
		&i.Status,
		&i.CreatedBy,
		&i.UpdatedBy,
		&i.PreviousLeaseID,
		&i.TenantSigningUrl,
		&i.PreviousLeaseID_2,
	)
	return i, err
}

const getDuplicateLease = `-- name: GetDuplicateLease :one
SELECT id,lease_number, external_doc_id, lease_pdf_s3,
  tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount,
  status, created_by, updated_by,
  previous_lease_id, tenant_signing_url, landlord_signing_url FROM leases
WHERE tenant_id = $1
  AND apartment_id = $2
  AND status = $3
LIMIT 1
`

type GetDuplicateLeaseParams struct {
	TenantID    int64       `json:"tenant_id"`
	ApartmentID int64       `json:"apartment_id"`
	Status      LeaseStatus `json:"status"`
}

type GetDuplicateLeaseRow struct {
	ID                 int64          `json:"id"`
	LeaseNumber        int64          `json:"lease_number"`
	ExternalDocID      string         `json:"external_doc_id"`
	LeasePdfS3         pgtype.Text    `json:"lease_pdf_s3"`
	TenantID           int64          `json:"tenant_id"`
	LandlordID         int64          `json:"landlord_id"`
	ApartmentID        int64          `json:"apartment_id"`
	LeaseStartDate     pgtype.Date    `json:"lease_start_date"`
	LeaseEndDate       pgtype.Date    `json:"lease_end_date"`
	RentAmount         pgtype.Numeric `json:"rent_amount"`
	Status             LeaseStatus    `json:"status"`
	CreatedBy          int64          `json:"created_by"`
	UpdatedBy          int64          `json:"updated_by"`
	PreviousLeaseID    pgtype.Int8    `json:"previous_lease_id"`
	TenantSigningUrl   pgtype.Text    `json:"tenant_signing_url"`
	LandlordSigningUrl pgtype.Text    `json:"landlord_signing_url"`
}

func (q *Queries) GetDuplicateLease(ctx context.Context, arg GetDuplicateLeaseParams) (GetDuplicateLeaseRow, error) {
	row := q.db.QueryRow(ctx, getDuplicateLease, arg.TenantID, arg.ApartmentID, arg.Status)
	var i GetDuplicateLeaseRow
	err := row.Scan(
		&i.ID,
		&i.LeaseNumber,
		&i.ExternalDocID,
		&i.LeasePdfS3,
		&i.TenantID,
		&i.LandlordID,
		&i.ApartmentID,
		&i.LeaseStartDate,
		&i.LeaseEndDate,
		&i.RentAmount,
		&i.Status,
		&i.CreatedBy,
		&i.UpdatedBy,
		&i.PreviousLeaseID,
		&i.TenantSigningUrl,
		&i.LandlordSigningUrl,
	)
	return i, err
}

const getLandlordSigningURLsByLandlordID = `-- name: GetLandlordSigningURLsByLandlordID :many
SELECT status,landlord_signing_url
FROM leases
WHERE landlord_id = $1
`

type GetLandlordSigningURLsByLandlordIDRow struct {
	Status             LeaseStatus `json:"status"`
	LandlordSigningUrl pgtype.Text `json:"landlord_signing_url"`
}

func (q *Queries) GetLandlordSigningURLsByLandlordID(ctx context.Context, landlordID int64) ([]GetLandlordSigningURLsByLandlordIDRow, error) {
	rows, err := q.db.Query(ctx, getLandlordSigningURLsByLandlordID, landlordID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetLandlordSigningURLsByLandlordIDRow
	for rows.Next() {
		var i GetLandlordSigningURLsByLandlordIDRow
		if err := rows.Scan(&i.Status, &i.LandlordSigningUrl); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getLeaseByExternalDocID = `-- name: GetLeaseByExternalDocID :one
SELECT id, lease_number, external_doc_id, lease_pdf_s3,
  tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount,
  status, created_by, updated_by,
  previous_lease_id, tenant_signing_url FROM leases
WHERE external_doc_id = $1
LIMIT 1
`

type GetLeaseByExternalDocIDRow struct {
	ID               int64          `json:"id"`
	LeaseNumber      int64          `json:"lease_number"`
	ExternalDocID    string         `json:"external_doc_id"`
	LeasePdfS3       pgtype.Text    `json:"lease_pdf_s3"`
	TenantID         int64          `json:"tenant_id"`
	LandlordID       int64          `json:"landlord_id"`
	ApartmentID      int64          `json:"apartment_id"`
	LeaseStartDate   pgtype.Date    `json:"lease_start_date"`
	LeaseEndDate     pgtype.Date    `json:"lease_end_date"`
	RentAmount       pgtype.Numeric `json:"rent_amount"`
	Status           LeaseStatus    `json:"status"`
	CreatedBy        int64          `json:"created_by"`
	UpdatedBy        int64          `json:"updated_by"`
	PreviousLeaseID  pgtype.Int8    `json:"previous_lease_id"`
	TenantSigningUrl pgtype.Text    `json:"tenant_signing_url"`
}

func (q *Queries) GetLeaseByExternalDocID(ctx context.Context, externalDocID string) (GetLeaseByExternalDocIDRow, error) {
	row := q.db.QueryRow(ctx, getLeaseByExternalDocID, externalDocID)
	var i GetLeaseByExternalDocIDRow
	err := row.Scan(
		&i.ID,
		&i.LeaseNumber,
		&i.ExternalDocID,
		&i.LeasePdfS3,
		&i.TenantID,
		&i.LandlordID,
		&i.ApartmentID,
		&i.LeaseStartDate,
		&i.LeaseEndDate,
		&i.RentAmount,
		&i.Status,
		&i.CreatedBy,
		&i.UpdatedBy,
		&i.PreviousLeaseID,
		&i.TenantSigningUrl,
	)
	return i, err
}

const getLeaseByExternalID = `-- name: GetLeaseByExternalID :one
SELECT id,
    lease_number,
    external_doc_id,
    lease_pdf_s3,
    tenant_id,
    landlord_id,
    apartment_id,
    lease_start_date,
    lease_end_date,
    rent_amount,
    status,
    created_by,
    updated_by,
    previous_lease_id,
    tenant_signing_url,
    landlord_signing_url
FROM leases
WHERE external_doc_id = $1
`

type GetLeaseByExternalIDRow struct {
	ID                 int64          `json:"id"`
	LeaseNumber        int64          `json:"lease_number"`
	ExternalDocID      string         `json:"external_doc_id"`
	LeasePdfS3         pgtype.Text    `json:"lease_pdf_s3"`
	TenantID           int64          `json:"tenant_id"`
	LandlordID         int64          `json:"landlord_id"`
	ApartmentID        int64          `json:"apartment_id"`
	LeaseStartDate     pgtype.Date    `json:"lease_start_date"`
	LeaseEndDate       pgtype.Date    `json:"lease_end_date"`
	RentAmount         pgtype.Numeric `json:"rent_amount"`
	Status             LeaseStatus    `json:"status"`
	CreatedBy          int64          `json:"created_by"`
	UpdatedBy          int64          `json:"updated_by"`
	PreviousLeaseID    pgtype.Int8    `json:"previous_lease_id"`
	TenantSigningUrl   pgtype.Text    `json:"tenant_signing_url"`
	LandlordSigningUrl pgtype.Text    `json:"landlord_signing_url"`
}

func (q *Queries) GetLeaseByExternalID(ctx context.Context, externalDocID string) (GetLeaseByExternalIDRow, error) {
	row := q.db.QueryRow(ctx, getLeaseByExternalID, externalDocID)
	var i GetLeaseByExternalIDRow
	err := row.Scan(
		&i.ID,
		&i.LeaseNumber,
		&i.ExternalDocID,
		&i.LeasePdfS3,
		&i.TenantID,
		&i.LandlordID,
		&i.ApartmentID,
		&i.LeaseStartDate,
		&i.LeaseEndDate,
		&i.RentAmount,
		&i.Status,
		&i.CreatedBy,
		&i.UpdatedBy,
		&i.PreviousLeaseID,
		&i.TenantSigningUrl,
		&i.LandlordSigningUrl,
	)
	return i, err
}

const getLeaseByID = `-- name: GetLeaseByID :one
SELECT id,
    lease_number,
    external_doc_id,
    lease_pdf_s3,
    tenant_id,
    landlord_id,
    apartment_id,
    lease_start_date,
    lease_end_date,
    rent_amount,
    status,
    created_by,
    updated_by,
    previous_lease_id,
    tenant_signing_url,
    landlord_signing_url
FROM leases
WHERE id = $1
`

type GetLeaseByIDRow struct {
	ID                 int64          `json:"id"`
	LeaseNumber        int64          `json:"lease_number"`
	ExternalDocID      string         `json:"external_doc_id"`
	LeasePdfS3         pgtype.Text    `json:"lease_pdf_s3"`
	TenantID           int64          `json:"tenant_id"`
	LandlordID         int64          `json:"landlord_id"`
	ApartmentID        int64          `json:"apartment_id"`
	LeaseStartDate     pgtype.Date    `json:"lease_start_date"`
	LeaseEndDate       pgtype.Date    `json:"lease_end_date"`
	RentAmount         pgtype.Numeric `json:"rent_amount"`
	Status             LeaseStatus    `json:"status"`
	CreatedBy          int64          `json:"created_by"`
	UpdatedBy          int64          `json:"updated_by"`
	PreviousLeaseID    pgtype.Int8    `json:"previous_lease_id"`
	TenantSigningUrl   pgtype.Text    `json:"tenant_signing_url"`
	LandlordSigningUrl pgtype.Text    `json:"landlord_signing_url"`
}

func (q *Queries) GetLeaseByID(ctx context.Context, id int64) (GetLeaseByIDRow, error) {
	row := q.db.QueryRow(ctx, getLeaseByID, id)
	var i GetLeaseByIDRow
	err := row.Scan(
		&i.ID,
		&i.LeaseNumber,
		&i.ExternalDocID,
		&i.LeasePdfS3,
		&i.TenantID,
		&i.LandlordID,
		&i.ApartmentID,
		&i.LeaseStartDate,
		&i.LeaseEndDate,
		&i.RentAmount,
		&i.Status,
		&i.CreatedBy,
		&i.UpdatedBy,
		&i.PreviousLeaseID,
		&i.TenantSigningUrl,
		&i.LandlordSigningUrl,
	)
	return i, err
}

const getLeaseForAmending = `-- name: GetLeaseForAmending :one
SELECT id, lease_number, external_doc_id, lease_pdf_s3,
  tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount,
  status, created_by, updated_by,
  previous_lease_id, tenant_signing_url, landlord_signing_url FROM leases
WHERE tenant_id = $1
  AND apartment_id = $2
  AND (status = 'active' OR status = 'draft')
ORDER BY created_at DESC
LIMIT 1
`

type GetLeaseForAmendingParams struct {
	TenantID    int64 `json:"tenant_id"`
	ApartmentID int64 `json:"apartment_id"`
}

type GetLeaseForAmendingRow struct {
	ID                 int64          `json:"id"`
	LeaseNumber        int64          `json:"lease_number"`
	ExternalDocID      string         `json:"external_doc_id"`
	LeasePdfS3         pgtype.Text    `json:"lease_pdf_s3"`
	TenantID           int64          `json:"tenant_id"`
	LandlordID         int64          `json:"landlord_id"`
	ApartmentID        int64          `json:"apartment_id"`
	LeaseStartDate     pgtype.Date    `json:"lease_start_date"`
	LeaseEndDate       pgtype.Date    `json:"lease_end_date"`
	RentAmount         pgtype.Numeric `json:"rent_amount"`
	Status             LeaseStatus    `json:"status"`
	CreatedBy          int64          `json:"created_by"`
	UpdatedBy          int64          `json:"updated_by"`
	PreviousLeaseID    pgtype.Int8    `json:"previous_lease_id"`
	TenantSigningUrl   pgtype.Text    `json:"tenant_signing_url"`
	LandlordSigningUrl pgtype.Text    `json:"landlord_signing_url"`
}

func (q *Queries) GetLeaseForAmending(ctx context.Context, arg GetLeaseForAmendingParams) (GetLeaseForAmendingRow, error) {
	row := q.db.QueryRow(ctx, getLeaseForAmending, arg.TenantID, arg.ApartmentID)
	var i GetLeaseForAmendingRow
	err := row.Scan(
		&i.ID,
		&i.LeaseNumber,
		&i.ExternalDocID,
		&i.LeasePdfS3,
		&i.TenantID,
		&i.LandlordID,
		&i.ApartmentID,
		&i.LeaseStartDate,
		&i.LeaseEndDate,
		&i.RentAmount,
		&i.Status,
		&i.CreatedBy,
		&i.UpdatedBy,
		&i.PreviousLeaseID,
		&i.TenantSigningUrl,
		&i.LandlordSigningUrl,
	)
	return i, err
}

const getMaxLeaseNumber = `-- name: GetMaxLeaseNumber :one
SELECT COALESCE(MAX(lease_number), 0) FROM leases 
where tenant_id = $1
`

func (q *Queries) GetMaxLeaseNumber(ctx context.Context, tenantID int64) (interface{}, error) {
	row := q.db.QueryRow(ctx, getMaxLeaseNumber, tenantID)
	var coalesce interface{}
	err := row.Scan(&coalesce)
	return coalesce, err
}

const getSignedLeasePdfS3URL = `-- name: GetSignedLeasePdfS3URL :one
SELECT lease_pdf_s3
FROM leases
WHERE id = $1
`

func (q *Queries) GetSignedLeasePdfS3URL(ctx context.Context, id int64) (pgtype.Text, error) {
	row := q.db.QueryRow(ctx, getSignedLeasePdfS3URL, id)
	var lease_pdf_s3 pgtype.Text
	err := row.Scan(&lease_pdf_s3)
	return lease_pdf_s3, err
}

const getTenantLeaseStatusAndURLByUserID = `-- name: GetTenantLeaseStatusAndURLByUserID :one
SELECT status,tenant_signing_url, lease_number
FROM leases
WHERE tenant_id = $1
ORDER BY lease_number DESC
LIMIT 1
`

type GetTenantLeaseStatusAndURLByUserIDRow struct {
	Status           LeaseStatus `json:"status"`
	TenantSigningUrl pgtype.Text `json:"tenant_signing_url"`
	LeaseNumber      int64       `json:"lease_number"`
}

func (q *Queries) GetTenantLeaseStatusAndURLByUserID(ctx context.Context, tenantID int64) (GetTenantLeaseStatusAndURLByUserIDRow, error) {
	row := q.db.QueryRow(ctx, getTenantLeaseStatusAndURLByUserID, tenantID)
	var i GetTenantLeaseStatusAndURLByUserIDRow
	err := row.Scan(&i.Status, &i.TenantSigningUrl, &i.LeaseNumber)
	return i, err
}

const listActiveLeases = `-- name: ListActiveLeases :one
SELECT id, lease_number, external_doc_id, lease_pdf_s3,
  tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount,
  status, created_by, updated_by,
  previous_lease_id, tenant_signing_url FROM leases
WHERE status = 'active'
LIMIT 1
`

type ListActiveLeasesRow struct {
	ID               int64          `json:"id"`
	LeaseNumber      int64          `json:"lease_number"`
	ExternalDocID    string         `json:"external_doc_id"`
	LeasePdfS3       pgtype.Text    `json:"lease_pdf_s3"`
	TenantID         int64          `json:"tenant_id"`
	LandlordID       int64          `json:"landlord_id"`
	ApartmentID      int64          `json:"apartment_id"`
	LeaseStartDate   pgtype.Date    `json:"lease_start_date"`
	LeaseEndDate     pgtype.Date    `json:"lease_end_date"`
	RentAmount       pgtype.Numeric `json:"rent_amount"`
	Status           LeaseStatus    `json:"status"`
	CreatedBy        int64          `json:"created_by"`
	UpdatedBy        int64          `json:"updated_by"`
	PreviousLeaseID  pgtype.Int8    `json:"previous_lease_id"`
	TenantSigningUrl pgtype.Text    `json:"tenant_signing_url"`
}

func (q *Queries) ListActiveLeases(ctx context.Context) (ListActiveLeasesRow, error) {
	row := q.db.QueryRow(ctx, listActiveLeases)
	var i ListActiveLeasesRow
	err := row.Scan(
		&i.ID,
		&i.LeaseNumber,
		&i.ExternalDocID,
		&i.LeasePdfS3,
		&i.TenantID,
		&i.LandlordID,
		&i.ApartmentID,
		&i.LeaseStartDate,
		&i.LeaseEndDate,
		&i.RentAmount,
		&i.Status,
		&i.CreatedBy,
		&i.UpdatedBy,
		&i.PreviousLeaseID,
		&i.TenantSigningUrl,
	)
	return i, err
}

const listLeases = `-- name: ListLeases :many
SELECT id, lease_number,
    external_doc_id,
    lease_pdf_s3,
    tenant_id,
    landlord_id,
    apartment_id,
    lease_start_date,
    lease_end_date,
    rent_amount,
    status,
    created_by,
    updated_by,
    previous_lease_id
FROM leases ORDER BY created_at DESC
`

type ListLeasesRow struct {
	ID              int64          `json:"id"`
	LeaseNumber     int64          `json:"lease_number"`
	ExternalDocID   string         `json:"external_doc_id"`
	LeasePdfS3      pgtype.Text    `json:"lease_pdf_s3"`
	TenantID        int64          `json:"tenant_id"`
	LandlordID      int64          `json:"landlord_id"`
	ApartmentID     int64          `json:"apartment_id"`
	LeaseStartDate  pgtype.Date    `json:"lease_start_date"`
	LeaseEndDate    pgtype.Date    `json:"lease_end_date"`
	RentAmount      pgtype.Numeric `json:"rent_amount"`
	Status          LeaseStatus    `json:"status"`
	CreatedBy       int64          `json:"created_by"`
	UpdatedBy       int64          `json:"updated_by"`
	PreviousLeaseID pgtype.Int8    `json:"previous_lease_id"`
}

func (q *Queries) ListLeases(ctx context.Context) ([]ListLeasesRow, error) {
	rows, err := q.db.Query(ctx, listLeases)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListLeasesRow
	for rows.Next() {
		var i ListLeasesRow
		if err := rows.Scan(
			&i.ID,
			&i.LeaseNumber,
			&i.ExternalDocID,
			&i.LeasePdfS3,
			&i.TenantID,
			&i.LandlordID,
			&i.ApartmentID,
			&i.LeaseStartDate,
			&i.LeaseEndDate,
			&i.RentAmount,
			&i.Status,
			&i.CreatedBy,
			&i.UpdatedBy,
			&i.PreviousLeaseID,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const markLeaseAsSignedBothParties = `-- name: MarkLeaseAsSignedBothParties :exec
UPDATE leases
SET status = 'active', updated_at = now()
WHERE id = $1
RETURNING lease_number,
    external_doc_id,
    lease_pdf_s3,
    tenant_id,
    landlord_id,
    apartment_id,
    lease_start_date,
    lease_end_date,
    rent_amount,
    status,
    created_by,
    updated_by,
    previous_lease_id
`

func (q *Queries) MarkLeaseAsSignedBothParties(ctx context.Context, id int64) error {
	_, err := q.db.Exec(ctx, markLeaseAsSignedBothParties, id)
	return err
}

const renewLease = `-- name: RenewLease :one
INSERT INTO leases (
  lease_number, external_doc_id, tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount, status, lease_pdf_s3,
  created_by, updated_by, previous_lease_id, tenant_signing_url, landlord_signing_url
)
VALUES (
  $1, $2, $3, $4, $5,
  $6, $7, $8, $9, $10,
  $11, $12, $13, $14, $15
)
RETURNING id, lease_number
`

type RenewLeaseParams struct {
	LeaseNumber        int64          `json:"lease_number"`
	ExternalDocID      string         `json:"external_doc_id"`
	TenantID           int64          `json:"tenant_id"`
	LandlordID         int64          `json:"landlord_id"`
	ApartmentID        int64          `json:"apartment_id"`
	LeaseStartDate     pgtype.Date    `json:"lease_start_date"`
	LeaseEndDate       pgtype.Date    `json:"lease_end_date"`
	RentAmount         pgtype.Numeric `json:"rent_amount"`
	Status             LeaseStatus    `json:"status"`
	LeasePdfS3         pgtype.Text    `json:"lease_pdf_s3"`
	CreatedBy          int64          `json:"created_by"`
	UpdatedBy          int64          `json:"updated_by"`
	PreviousLeaseID    pgtype.Int8    `json:"previous_lease_id"`
	TenantSigningUrl   pgtype.Text    `json:"tenant_signing_url"`
	LandlordSigningUrl pgtype.Text    `json:"landlord_signing_url"`
}

type RenewLeaseRow struct {
	ID          int64 `json:"id"`
	LeaseNumber int64 `json:"lease_number"`
}

func (q *Queries) RenewLease(ctx context.Context, arg RenewLeaseParams) (RenewLeaseRow, error) {
	row := q.db.QueryRow(ctx, renewLease,
		arg.LeaseNumber,
		arg.ExternalDocID,
		arg.TenantID,
		arg.LandlordID,
		arg.ApartmentID,
		arg.LeaseStartDate,
		arg.LeaseEndDate,
		arg.RentAmount,
		arg.Status,
		arg.LeasePdfS3,
		arg.CreatedBy,
		arg.UpdatedBy,
		arg.PreviousLeaseID,
		arg.TenantSigningUrl,
		arg.LandlordSigningUrl,
	)
	var i RenewLeaseRow
	err := row.Scan(&i.ID, &i.LeaseNumber)
	return i, err
}

const storeGeneratedLeasePDFURL = `-- name: StoreGeneratedLeasePDFURL :exec
UPDATE leases
SET lease_pdf_s3 = $1, external_doc_id = $2, updated_at = now()
WHERE id = $3
RETURNING lease_pdf_s3
`

type StoreGeneratedLeasePDFURLParams struct {
	LeasePdfS3    pgtype.Text `json:"lease_pdf_s3"`
	ExternalDocID string      `json:"external_doc_id"`
	ID            int64       `json:"id"`
}

func (q *Queries) StoreGeneratedLeasePDFURL(ctx context.Context, arg StoreGeneratedLeasePDFURLParams) error {
	_, err := q.db.Exec(ctx, storeGeneratedLeasePDFURL, arg.LeasePdfS3, arg.ExternalDocID, arg.ID)
	return err
}

const terminateLease = `-- name: TerminateLease :one
UPDATE leases
SET
    status = 'terminated', 
    updated_by = $1, 
    updated_at = now()
WHERE id = $2
RETURNING id, lease_number, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, status, 
    updated_by, updated_at, previous_lease_id
`

type TerminateLeaseParams struct {
	UpdatedBy int64 `json:"updated_by"`
	ID        int64 `json:"id"`
}

type TerminateLeaseRow struct {
	ID              int64            `json:"id"`
	LeaseNumber     int64            `json:"lease_number"`
	ExternalDocID   string           `json:"external_doc_id"`
	TenantID        int64            `json:"tenant_id"`
	LandlordID      int64            `json:"landlord_id"`
	ApartmentID     int64            `json:"apartment_id"`
	LeaseStartDate  pgtype.Date      `json:"lease_start_date"`
	LeaseEndDate    pgtype.Date      `json:"lease_end_date"`
	RentAmount      pgtype.Numeric   `json:"rent_amount"`
	Status          LeaseStatus      `json:"status"`
	UpdatedBy       int64            `json:"updated_by"`
	UpdatedAt       pgtype.Timestamp `json:"updated_at"`
	PreviousLeaseID pgtype.Int8      `json:"previous_lease_id"`
}

func (q *Queries) TerminateLease(ctx context.Context, arg TerminateLeaseParams) (TerminateLeaseRow, error) {
	row := q.db.QueryRow(ctx, terminateLease, arg.UpdatedBy, arg.ID)
	var i TerminateLeaseRow
	err := row.Scan(
		&i.ID,
		&i.LeaseNumber,
		&i.ExternalDocID,
		&i.TenantID,
		&i.LandlordID,
		&i.ApartmentID,
		&i.LeaseStartDate,
		&i.LeaseEndDate,
		&i.RentAmount,
		&i.Status,
		&i.UpdatedBy,
		&i.UpdatedAt,
		&i.PreviousLeaseID,
	)
	return i, err
}

const updateLease = `-- name: UpdateLease :exec
UPDATE leases
SET 
    tenant_id = $1,
    status = $2,
    status = $2,
    lease_start_date = $3,
    lease_end_date = $4,
    rent_amount = $5,
    updated_by = $6,
    updated_at = now()
WHERE id = $7
RETURNING lease_number,
    external_doc_id,
    lease_pdf_s3,
    tenant_id,
    landlord_id,
    apartment_id,
    lease_start_date,
    lease_end_date,
    rent_amount,
    status,
    created_by,
    updated_by,
    previous_lease_id
`

type UpdateLeaseParams struct {
	TenantID       int64          `json:"tenant_id"`
	Status         LeaseStatus    `json:"status"`
	LeaseStartDate pgtype.Date    `json:"lease_start_date"`
	LeaseEndDate   pgtype.Date    `json:"lease_end_date"`
	RentAmount     pgtype.Numeric `json:"rent_amount"`
	UpdatedBy      int64          `json:"updated_by"`
	ID             int64          `json:"id"`
}

func (q *Queries) UpdateLease(ctx context.Context, arg UpdateLeaseParams) error {
	_, err := q.db.Exec(ctx, updateLease,
		arg.TenantID,
		arg.Status,
		arg.LeaseStartDate,
		arg.LeaseEndDate,
		arg.RentAmount,
		arg.UpdatedBy,
		arg.ID,
	)
	return err
}

const updateLeaseAndApartmentOnDocumentCompletion = `-- name: UpdateLeaseAndApartmentOnDocumentCompletion :one
WITH updated_lease AS (
    UPDATE leases
    SET 
        status = 'active',
        updated_at = now(),
        updated_by = $2
    WHERE external_doc_id = $1
    RETURNING id, apartment_id, rent_amount, landlord_id
)
UPDATE apartments
SET 
    availability = false,
    lease_id = (SELECT id FROM updated_lease),
    updated_at = now()
WHERE id = (SELECT apartment_id FROM updated_lease)
RETURNING 
    (SELECT json_build_object(
        'lease_id', ul.id,
        'apartment_id', ul.apartment_id,
        'success', true
    ) FROM updated_lease ul)
`

type UpdateLeaseAndApartmentOnDocumentCompletionParams struct {
	ExternalDocID string `json:"external_doc_id"`
	UpdatedBy     int64  `json:"updated_by"`
}

func (q *Queries) UpdateLeaseAndApartmentOnDocumentCompletion(ctx context.Context, arg UpdateLeaseAndApartmentOnDocumentCompletionParams) ([]byte, error) {
	row := q.db.QueryRow(ctx, updateLeaseAndApartmentOnDocumentCompletion, arg.ExternalDocID, arg.UpdatedBy)
	var json_build_object []byte
	err := row.Scan(&json_build_object)
	return json_build_object, err
}

const updateLeasePDF = `-- name: UpdateLeasePDF :exec
UPDATE leases
SET 
    lease_pdf_s3 = $2, 
    updated_by = $3,
    updated_at = NOW()
WHERE id = $1
`

type UpdateLeasePDFParams struct {
	ID         int64       `json:"id"`
	LeasePdfS3 pgtype.Text `json:"lease_pdf_s3"`
	UpdatedBy  int64       `json:"updated_by"`
}

func (q *Queries) UpdateLeasePDF(ctx context.Context, arg UpdateLeasePDFParams) error {
	_, err := q.db.Exec(ctx, updateLeasePDF, arg.ID, arg.LeasePdfS3, arg.UpdatedBy)
	return err
}

const updateLeaseStatus = `-- name: UpdateLeaseStatus :one
UPDATE leases
SET status = $2, updated_by = $3, updated_at = NOW()
WHERE id = $1
RETURNING id, lease_number, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, status, created_by, 
    updated_by, updated_at, previous_lease_id
`

type UpdateLeaseStatusParams struct {
	ID        int64       `json:"id"`
	Status    LeaseStatus `json:"status"`
	UpdatedBy int64       `json:"updated_by"`
}

type UpdateLeaseStatusRow struct {
	ID              int64            `json:"id"`
	LeaseNumber     int64            `json:"lease_number"`
	ExternalDocID   string           `json:"external_doc_id"`
	TenantID        int64            `json:"tenant_id"`
	LandlordID      int64            `json:"landlord_id"`
	ApartmentID     int64            `json:"apartment_id"`
	LeaseStartDate  pgtype.Date      `json:"lease_start_date"`
	LeaseEndDate    pgtype.Date      `json:"lease_end_date"`
	RentAmount      pgtype.Numeric   `json:"rent_amount"`
	Status          LeaseStatus      `json:"status"`
	CreatedBy       int64            `json:"created_by"`
	UpdatedBy       int64            `json:"updated_by"`
	UpdatedAt       pgtype.Timestamp `json:"updated_at"`
	PreviousLeaseID pgtype.Int8      `json:"previous_lease_id"`
}

func (q *Queries) UpdateLeaseStatus(ctx context.Context, arg UpdateLeaseStatusParams) (UpdateLeaseStatusRow, error) {
	row := q.db.QueryRow(ctx, updateLeaseStatus, arg.ID, arg.Status, arg.UpdatedBy)
	var i UpdateLeaseStatusRow
	err := row.Scan(
		&i.ID,
		&i.LeaseNumber,
		&i.ExternalDocID,
		&i.TenantID,
		&i.LandlordID,
		&i.ApartmentID,
		&i.LeaseStartDate,
		&i.LeaseEndDate,
		&i.RentAmount,
		&i.Status,
		&i.CreatedBy,
		&i.UpdatedBy,
		&i.UpdatedAt,
		&i.PreviousLeaseID,
	)
	return i, err
}

const updateSignedLeasePdfS3URL = `-- name: UpdateSignedLeasePdfS3URL :exec
UPDATE leases
SET lease_pdf_s3 = $2,
    updated_at = now()
WHERE id = $1
`

type UpdateSignedLeasePdfS3URLParams struct {
	ID         int64       `json:"id"`
	LeasePdfS3 pgtype.Text `json:"lease_pdf_s3"`
}

func (q *Queries) UpdateSignedLeasePdfS3URL(ctx context.Context, arg UpdateSignedLeasePdfS3URLParams) error {
	_, err := q.db.Exec(ctx, updateSignedLeasePdfS3URL, arg.ID, arg.LeasePdfS3)
	return err
}

const updateSigningURLs = `-- name: UpdateSigningURLs :exec
UPDATE leases
SET tenant_signing_url = $2,
    landlord_signing_url = $3,
    updated_at = now()
WHERE id = $1
`

type UpdateSigningURLsParams struct {
	ID                 int64       `json:"id"`
	TenantSigningUrl   pgtype.Text `json:"tenant_signing_url"`
	LandlordSigningUrl pgtype.Text `json:"landlord_signing_url"`
}

func (q *Queries) UpdateSigningURLs(ctx context.Context, arg UpdateSigningURLsParams) error {
	_, err := q.db.Exec(ctx, updateSigningURLs, arg.ID, arg.TenantSigningUrl, arg.LandlordSigningUrl)
	return err
}
