-- name: CreateLease :one
INSERT INTO leases (
    lease_version, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, lease_status, lease_pdf, created_by
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING id;

-- name: RenewLease :exec
UPDATE leases
SET 
    lease_start_date = $2, 
    lease_end_date = $1,
    updated_by = $3, 
    updated_at = now()
WHERE id = $3 AND lease_status = 'active'
RETURNING id, lease_version, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, lease_status, lease_pdf,
    updated_by, updated_at;

-- name: TerminateLease :exec
UPDATE leases
SET 
    lease_status = 'terminated', 
    updated_by = $1, 
    updated_at = now()
WHERE id = $2
RETURNING id, lease_version, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, lease_status, 
    updated_by, updated_at;

-- name: ListLeases :many
SELECT * FROM leases ORDER BY created_at DESC;

-- name: GetLeaseByID :one
SELECT id, lease_version, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, lease_status, lease_pdf
FROM leases
WHERE id = $1;

-- name: UpdateLease :exec
UPDATE leases
SET 
    tenant_id = $1,
    lease_status = $2,
    lease_start_date = $3,
    lease_end_date = $4,
    rent_amount = $5,
    updated_by = $6,
    updated_at = now()
WHERE id = $7
RETURNING id, lease_version, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, lease_status, 
    updated_by, updated_at;