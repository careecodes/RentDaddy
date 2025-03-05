-- name: CreateTenant :one
INSERT INTO tenants (
    name, 
    email
) VALUES (
    $1, $2
) RETURNING id, name, email, created_at;

-- name: GetTenantByID :one
SELECT id, name, email, created_at
FROM tenants
WHERE id = $1;

-- name: GetTenants :many
SELECT id, name, email, created_at
FROM tenants
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: DeleteTenant :exec
DELETE FROM tenants
WHERE id = $1;
