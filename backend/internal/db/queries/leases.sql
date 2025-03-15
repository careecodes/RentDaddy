-- PLEASE SHRINK THE LEASES TABLE AND MAKE SURE THESE QUERIES ACTUALLY WORK VIA
-- sqlc vet at the backend folder
-- ALSO MAKE SURE baseTables.sql match init.up.sql
-- name: CreateLease :one
INSERT INTO leases (external_doc_id, tenant_id, landlord_id, lease_start_date, lease_end_date, rent_amount, lease_status)
VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT')
RETURNING document_id;

-- name: RenewLease :one
UPDATE leases
SET lease_end_date = $1, updated_at = now()
WHERE document_id  = $2 AND lease_status = 'active'
RETURNING *;

-- name: TerminateLease :one
UPDATE leases
SET lease_status = 'terminated', updated_at = now()
WHERE document_id  = $1
RETURNING *;

-- name: ListLeases :many
SELECT * FROM leases ORDER BY created_at DESC;

-- name: GetLeaseByID :one
SELECT * FROM leases WHERE document_id = $1 LIMIT 1;

-- name: UpdateLease :one
UPDATE leases
SET document_id = $1,
    tenant_id = $2,
    lease_status = $3,
    lease_start_date = $4,
    lease_end_date = $5,
    updated_at = now()
WHERE document_id = $6
RETURNING *;

