-- name: CreateApartment :one
INSERT INTO apartments (
    unit_number,
    price,
    size,
    management_id,
    building_id,
    availability,
    created_at,
    updated_at
  ) VALUES ($1, $2, $3, $4, $5, $6, now(), now())

RETURNING *;

-- name: GetApartmentByUnitNumber :one
SELECT id 
FROM apartments
WHERE unit_number = $1;

-- name: GetApartment :one
SELECT id,
  unit_number,
  price,
  size,
  management_id,
  availability
FROM apartments
WHERE id = $1
LIMIT 1;

-- name: ListApartments :many
SELECT id,
  unit_number,
  price,
  size,
  management_id,
  availability
FROM apartments
ORDER BY unit_number DESC;

-- name: UpdateApartment :exec
UPDATE apartments
SET price = $2,
  management_id = $3,
  availability = $4,
  updated_at = now()
WHERE id = $1;

-- name: DeleteApartment :exec
DELETE FROM apartments
WHERE id = $1;


-- name: ListApartmentsWithoutLease :many
SELECT id,
  unit_number,
  price,
  size,
  management_id,
  availability,
  lease_id
FROM apartments
ORDER BY unit_number DESC
LIMIT $1 OFFSET $2;

-- name: GetApartmentsWithoutLease :many
SELECT 
  id,
  unit_number,
  price,
  size,
  management_id,
  availability
FROM apartments
WHERE 
  id NOT IN (
    SELECT apartment_id FROM leases 
    WHERE status = 'active'
  )
  AND availability = true
ORDER BY unit_number ASC;