-- name: CreateTenant :one
INSERT INTO tenants (
    name, 
    email
) VALUES (
    ?, ?
) RETURNING id, name, email, created_at;

-- name: GetTenantByID :one
SELECT id, name, email, created_at
FROM tenants
WHERE id = ?;

-- name: GetTenants :many
SELECT id, name, email, created_at
FROM tenants
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: DeleteTenant :exec
DELETE FROM tenants
WHERE id = ?;
