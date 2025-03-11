-- name: CreateUser :one
INSERT INTO users (
    clerk_id,
    first_name,
    last_name,
    email,
    role,
    status,
    last_login,
    updated_at,
    created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING id, clerk_id, first_name, last_name, email, role, created_at;

-- name: UpdateUserRole :exec
UPDATE users
SET role = $1
WHERE clerk_id = $2;

-- name: UpdateUserCredentials :exec
UPDATE users
SET first_name = $1, last_name = $2, email = $3
WHERE clerk_id = $4;

-- name: GetUserByClerkID :one
SELECT id, clerk_id, first_name, last_name, email, role, unit_number, status, created_at
FROM users
WHERE clerk_id = $1;

-- name: GetUsers :many
SELECT id, clerk_id, first_name, last_name, email, role, unit_number, status, created_at
FROM users
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: DeleteUserByClerkID :exec
DELETE FROM users
WHERE clerk_id = $1;

-- name: GetTenantByClerkID :one 
SELECT id, clerk_id, first_name, last_name, email, role, unit_number, status, created_at
FROM users
WHERE clerk_id = $1 AND role = 'tenant';

-- name: GetAllTenants : many
SELECT id, clerk_id, first_name, last_name, email, role, unit_number, status, created_at
FROM users
WHERE clerk_id = $1 AND role = 'tenant'
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: GetAdminByClerkID :one 
SELECT id, clerk_id, first_name, last_name, email, role, unit_number, status, created_at
FROM users
WHERE clerk_id = $1 AND role = 'admin';

