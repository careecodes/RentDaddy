-- name: CreateApartment :one
INSERT INTO apartments (
    unit_number,
    price,
    size,
    management_id,
    availability,
    lease_id,
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
  availability,
  lease_id
FROM apartments
WHERE id = $1
LIMIT 1;

-- name: ListApartments :many
SELECT id,
  unit_number,
  price,
  size,
  management_id,
  availability,
  lease_id
FROM apartments
ORDER BY unit_number DESC;

-- name: UpdateApartment :exec
UPDATE apartments
SET price = $2,
  management_id = $3,
  availability = $4,
  lease_id = $5,
  updated_at = now()
WHERE id = $1;

-- name: DeleteApartment :exec
DELETE FROM apartments
WHERE id = $1;
