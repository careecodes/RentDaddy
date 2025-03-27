-- name: CreateUser :one
INSERT INTO users (
    clerk_id,
    first_name,
    last_name,
    email,
    phone,
    role,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, now()
) RETURNING id, clerk_id, first_name, last_name, email, phone, role, created_at;


-- name: GetUser :one
SELECT id, clerk_id, first_name, last_name, email, phone, role, status, created_at
FROM users
WHERE clerk_id = $1
LIMIT 1;

-- name: ListUsersByRole :many
SELECT id, clerk_id, first_name, last_name, email, phone, role, status, created_at
FROM users
WHERE role = $1
ORDER BY created_at DESC;

-- name: ListTenantsWithLeases :many
SELECT 
    users.id,
    users.clerk_id,
    users.first_name,
    users.last_name,
    users.email,
    users.phone,
    users.role,
    users.status,
    users.created_at,
    leases.status,
    leases.lease_start_date,
    leases.lease_end_date
FROM users
LEFT JOIN leases
ON users.id = leases.tenant_id
WHERE users.role = 'tenant'
ORDER BY users.created_at DESC;

-- name: UpdateUser :exec
UPDATE users
SET first_name = $2, last_name = $3, email = $4, phone = $5, updated_at = now()
WHERE clerk_id = $1;

-- name: DeleteUser :exec
DELETE FROM users
WHERE clerk_id = $1;

-- name: GetUserByID :one
SELECT id, clerk_id, first_name, last_name, email, phone, image_url, role, status
FROM users
WHERE id = $1
LIMIT 1;

-- name: GetTenantsWithNoLease :many
SELECT id, clerk_id, first_name, last_name, email, phone, image_url, role, status
FROM users
WHERE role = 'tenant' 
AND id NOT IN (SELECT tenant_id FROM leases);
