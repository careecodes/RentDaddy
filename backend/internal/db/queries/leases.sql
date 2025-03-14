-- name: CreateLease :one
INSERT INTO leases (
    lease_number, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, lease_status,
    created_by, updated_by
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING id;

-- name: RenewLease :exec
UPDATE leases
SET 
    lease_end_date = $1, 
    updated_by = $2, 
    updated_at = now()
WHERE id = $3 AND lease_status = 'active'
RETURNING id, lease_number, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, lease_status, 
    updated_by, updated_at;

-- name: TerminateLease :exec
UPDATE leases
SET 
    lease_status = 'terminated', 
    updated_by = $1, 
    updated_at = now()
WHERE id = $2
RETURNING id, lease_number, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, lease_status, 
     updated_by, updated_at;

-- name: ListLeases :many
SELECT * FROM leases ORDER BY created_at DESC;

-- name: GetLeaseByID :one
SELECT * FROM leases WHERE id = $1 LIMIT 1;

-- name: GetLeaseByNumber :one
SELECT * FROM leases WHERE lease_number = $1 LIMIT 1;

-- name: UpdateLease :exec
UPDATE leases
SET 
    tenant_id = $1,
    lease_status = $2,
    lease_start_date = $3,
    lease_end_date = $4,
    updated_by = $5,
    updated_at = now()
WHERE id = $6
RETURNING id, lease_number, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, lease_status, 
    updated_by, updated_at;

