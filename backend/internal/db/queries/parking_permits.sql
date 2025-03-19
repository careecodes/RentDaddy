-- name: CreateParkingPermit :one
INSERT INTO parking_permits (
    permit_number,
    created_by,
    expires_at,
    updated_at
)
VALUES (
    $1,
    $2,
    $3,
    now()
)
RETURNING *;

-- name: GetNumOfUserParkingPermits :one
SELECT COUNT(*)
FROM parking_permits
WHERE created_by = $1;

-- name: GetParkingPermit :one
SELECT permit_number, created_by, updated_at, expires_at
FROM parking_permits
WHERE permit_number = $1
LIMIT 1;

-- name: ListParkingPermits :many
SELECT *
FROM parking_permits
ORDER BY created_by DESC;

-- name: DeleteParkingPermit :exec
DELETE FROM parking_permits
WHERE id = $1;

