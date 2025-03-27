-- name: CreateManyParkingPermits :execrows
INSERT INTO parking_permits (
     license_plate,
     car_make,
     car_color,
     created_by,
     expires_at)
SELECT NULL::TEXT,
       NULL::TEXT,
       NULL::TEXT,
       NULL::BIGINT,
       NULL::TIMESTAMP -- default null expires_at
FROM generate_series(1, sqlc.arg(count)::int);

-- name: GetNumOfUserParkingPermits :one
SELECT COUNT(*)
FROM parking_permits
WHERE created_by = $1;

-- name: GetParkingPermit :one
SELECT *
FROM parking_permits
WHERE id = $1
LIMIT 1;

-- name: GetAvailableParkingPermit :one
SELECT *
FROM parking_permits
WHERE available IS TRUE
LIMIT 1;

-- name: GetTenantParkingPermits :many
SELECT *
FROM parking_permits
WHERE created_by = $1;

-- name: ListParkingPermits :many
SELECT *
FROM parking_permits
ORDER BY created_by DESC;

-- name: UpdateParkingPermit :exec
UPDATE parking_permits
SET license_plate = $2,
    car_make = $3,
    car_color = $4,
    available = FALSE,
    created_by = $5,
    expires_at = $6
WHERE id = $1;

-- name: ClearParkingPermit :exec
UPDATE parking_permits
SET license_plate = NULL,
    car_make = NULL,
    car_color = NULL,
    available = TRUE,
    expires_at = NULL,
    created_by = NULL
WHERE id = $1;
