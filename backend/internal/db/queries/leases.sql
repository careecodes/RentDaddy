-- name: CreateLease :one
INSERT INTO leases (
    lease_number, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, status, lease_pdf, created_by, updated_by
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
RETURNING id;

-- name: RenewLease :one
INSERT INTO leases (lease_number, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, status, lease_pdf, created_by, updated_by,
    previous_lease_id
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING id, lease_number;

-- name: GetDuplicateLease :one
SELECT * FROM leases
WHERE tenant_id = $1
  AND apartment_id = $2
  AND status = $3
LIMIT 1;

-- name: TerminateLease :one
-- name: TerminateLease :one
UPDATE leases
SET 
    status = 'terminated', 
    updated_by = $1, 
    updated_at = now()
WHERE id = $2
RETURNING id, lease_number, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, status, 
    updated_by, updated_at, previous_lease_id;

-- name: ListLeases :many
SELECT id, lease_number,
    external_doc_id,
    lease_pdf,
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
FROM leases ORDER BY created_at DESC;

-- name: GetLeaseByID :one
SELECT lease_number,
    external_doc_id,
    lease_pdf,
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
FROM leases
WHERE id = $1;

-- name: UpdateLease :exec
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
    lease_pdf,
    tenant_id,
    landlord_id,
    apartment_id,
    lease_start_date,
    lease_end_date,
    rent_amount,
    status,
    created_by,
    updated_by,
    previous_lease_id;


-- name: StoreGeneratedLeasePDF :exec
UPDATE leases
SET lease_pdf = $1, external_doc_id = $2, updated_at = now()
WHERE id = $3
RETURNING lease_pdf;


-- name: MarkLeaseAsSignedBothParties :exec
-- name: MarkLeaseAsSignedBothParties :exec
UPDATE leases
SET status = 'active', updated_at = now()
WHERE id = $1
RETURNING lease_number,
    external_doc_id,
    lease_pdf,
    tenant_id,
    landlord_id,
    apartment_id,
    lease_start_date,
    lease_end_date,
    rent_amount,
    status,
    created_by,
    updated_by,
    previous_lease_id;

-- name: UpdateLeasePDF :exec
UPDATE leases
SET 
    lease_pdf = $2, 
    updated_by = $3,
    updated_at = NOW()
WHERE id = $1;



-- name: GetConflictingActiveLease :one
SELECT * FROM leases
WHERE tenant_id = $1
  AND status = 'active'
  AND lease_start_date <= $3
  AND lease_end_date >= $2
LIMIT 1;
-- name: ExpireLeasesEndingToday :exec
UPDATE leases
SET status = 'expired', updated_by = 0
WHERE status = 'active'
  AND lease_end_date = CURRENT_DATE;
