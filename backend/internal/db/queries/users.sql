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
) RETURNING id, clerk_id, email, phone,role, created_at;

-- name: CreateTenant :exec 
INSERT INTO users (
    first_name,
    last_name,
    email,
    phone,
    unit_number,
    last_login,
    updated_at,
    created_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING id, first_name, last_name, email, phone, created_at;

-- name: CreateAdmin :exec
INSERT INTO users (
    first_name,
    last_name,
    email,
    role,
    phone,
    last_login,
    updated_at,
    created_at
) VALUES (
    $1, $2, $3, 'admin', $5, $6, $7, $8
) RETURNING id, first_name, last_name, email, phone, created_at;

-- name: UpdateUserRole :exec
UPDATE users
SET role = $2
WHERE clerk_id = $1;

-- name: UpdateUserCredentials :exec
UPDATE users
SET first_name = $2, last_name = $3, email = $4
WHERE clerk_id = $1;

-- name: GetTenantsOldUnitNumber :one 
SELECT unit_number
FROM users
WHERE clerk_id = $1;

-- name: UpdateTenantProfile :exec
UPDATE users 
SET first_name = $2, last_name = $3, email = $4, phone = $5, unit_number = $6 
WHERE clerk_id = $1 AND role = 'tenant';

-- name: UpdateTenantsApartment :exec
UPDATE apartments
SET unit_number = $1, lease_end_date = $2
WHERE unit_number = (SELECT unit_number FROM apartments WHERE unit_number = $1);

-- name: UpdateTenatsLeaseStatus :exec
UPDATE leases
SET lease_status = $1
WHERE apartment_id = (
    SELECT id
    FROM apartments
    WHERE unit_number = (SELECT unit_number FROM apartments WHERE id = $2)
);


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

-- name: GetAllTenants :many
SELECT id, clerk_id, first_name, last_name, email, role, unit_number, status, created_at
FROM users
WHERE clerk_id = $1 AND role = 'tenant'
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: GetAdminByClerkID :one 
SELECT id, clerk_id, first_name, last_name, email, role, unit_number, status, created_at
FROM users
WHERE clerk_id = $1 AND role = 'admin';

