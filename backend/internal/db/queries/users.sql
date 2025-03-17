-- name: CreateUser :one
INSERT INTO users (
    clerk_id,
    first_name,
    last_name,
    email,
    phone,
    role,
    last_login,
    updated_at,
    created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING id, clerk_id, first_name, last_name, email, phone, role, created_at;

-- name: UpdateUserRole :exec
UPDATE users
SET role = $2
WHERE clerk_id = $1;

-- name: UpdateUserCredentials :exec
UPDATE users
SET first_name = $2, last_name = $3, email = $4, phone = $5
WHERE clerk_id = $1;

-- name: GetUserByClerkID :one
SELECT id, clerk_id, first_name, last_name, email, phone, role, unit_number, status, created_at
FROM users
WHERE clerk_id = $1
LIMIT 1;

-- name: GetUsers :many
SELECT id, clerk_id, first_name, last_name, email, phone, role, unit_number, status, created_at
FROM users
WHERE role = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetUsersByRole :many
SELECT id, clerk_id, first_name, last_name, email, phone, role, unit_number, status, created_at
FROM users
WHERE role = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;


-- name: DeleteUserByClerkID :exec
DELETE FROM users
WHERE clerk_id = $1;

-- name: UpdateTenantProfile :exec
UPDATE users 
SET first_name = $2, last_name = $3, email = $4, phone = $5, unit_number = $6 
WHERE clerk_id = $1 AND role = 'tenant';

-- name: GetTenantsUnitNumber :one 
SELECT unit_number
FROM users
WHERE clerk_id = $1;

-- name: UpdateTenantsUnitNumber :exec
UPDATE users
SET unit_number = $2
WHERE clerk_id = $1;

-- name: GetTenantByClerkID :one 
SELECT id, clerk_id, first_name, last_name, email, role, unit_number, status, created_at
FROM users
WHERE clerk_id = $1 AND role = 'tenant'
LIMIT 1;

-- name: GetAdminByClerkID :one 
SELECT id, clerk_id, first_name, last_name, email, role, unit_number, status, created_at
FROM users
WHERE clerk_id = $1 AND role = 'admin'
LIMIT 1;

