-- name: CreateLease :one
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
RETURNING *;


-- name: RenewLease :one
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
RETURNING id, lease_number;

-- name: GetMaxLeaseNumber :one
SELECT COALESCE(MAX(lease_number), 0) FROM leases 
where tenant_id = $1;

-- name: GetDuplicateLease :one
SELECT id,lease_number, external_doc_id, lease_pdf_s3,
  tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount,
  status, created_by, updated_by,
  previous_lease_id, tenant_signing_url, , landlord_signing_url FROM leases
WHERE tenant_id = $1
  AND apartment_id = $2
  AND status = $3
LIMIT 1;


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
FROM leases ORDER BY created_at DESC;

-- name: GetLeaseByID :one
SELECT lease_number,
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
    previous_lease_id;


-- name: StoreGeneratedLeasePDFURL :exec
UPDATE leases
SET lease_pdf_s3 = $1, external_doc_id = $2, updated_at = now()
WHERE id = $3
RETURNING lease_pdf_s3;


-- name: MarkLeaseAsSignedBothParties :exec
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
    previous_lease_id;

-- name: UpdateLeasePDF :exec
UPDATE leases
SET 
    lease_pdf_s3 = $2, 
    updated_by = $3,
    updated_at = NOW()
WHERE id = $1;

-- name: GetConflictingActiveLease :one
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
LIMIT 1;

-- name: ExpireLeasesEndingToday :one
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
FROM expired_leases;


-- name: ListActiveLeases :one
SELECT id, lease_number, external_doc_id, lease_pdf_s3,
  tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount,
  status, created_by, updated_by,
  previous_lease_id, tenant_signing_url FROM leases
WHERE status = 'active'
LIMIT 1;

-- name: GetLeaseByExternalDocID :one
SELECT id, lease_number, external_doc_id, lease_pdf_s3,
  tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount,
  status, created_by, updated_by,
  previous_lease_id, tenant_signing_url FROM leases
WHERE external_doc_id = $1
LIMIT 1;

-- name: UpdateLeaseStatus :one
UPDATE leases
SET status = $2, updated_by = $3, updated_at = NOW()
WHERE id = $1
RETURNING id, lease_number, external_doc_id, tenant_id, landlord_id, apartment_id, 
    lease_start_date, lease_end_date, rent_amount, status, created_by, 
    updated_by, updated_at, previous_lease_id;


-- name: UpdateSigningURLs :exec
UPDATE leases
SET tenant_signing_url = $2,
    landlord_signing_url = $3,
    updated_at = now()
WHERE id = $1;

-- name: UpdateSignedLeasePdfS3URL :exec
UPDATE leases
SET lease_pdf_s3 = $2,
    updated_at = now()
WHERE id = $1;


-- name: GetSignedLeasePdfS3URL :one
SELECT lease_pdf_s3
FROM leases
WHERE id = $1;


-- name: UpdateLeaseAndApartmentOnDocumentCompletion :one
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
WHERE id = (SELECT apartment_id FROM updated_lease WHERE apartment_id IS NOT NULL)
RETURNING 
    (SELECT json_build_object(
        'lease_id', ul.id,
        'apartment_id', ul.apartment_id,
        'success', true
    ) FROM updated_lease ul);


-- name: GetTenantLeaseStatusAndURLByUserID :one
SELECT status,tenant_signing_url, lease_number
FROM leases
WHERE tenant_id = $1
ORDER BY lease_number DESC
LIMIT 1;


-- name: GetLandlordSigningURLsByLandlordID :many
SELECT status,landlord_signing_url
FROM leases
WHERE landlord_id = $1;

-- name: GetLeaseForAmending :one
SELECT id, lease_number, external_doc_id, lease_pdf_s3,
  tenant_id, landlord_id, apartment_id,
  lease_start_date, lease_end_date, rent_amount,
  status, created_by, updated_by,
  previous_lease_id, tenant_signing_url, landlord_signing_url FROM leases
WHERE tenant_id = $1
  AND apartment_id = $2
  AND (status = 'active' OR status = 'draft')
ORDER BY created_at DESC
LIMIT 1;

-- name: GetActiveLeasesByTenant :many
SELECT * FROM leases
WHERE tenant_id = $1
AND status IN ('active', 'draft', 'pending_approval')
ORDER BY id DESC;