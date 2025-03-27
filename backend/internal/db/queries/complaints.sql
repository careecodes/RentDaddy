-- name: CreateComplaint :one
INSERT INTO complaints (
    created_by,
    category,
    title,
    description,
    unit_number
  )
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetComplaint :one
SELECT id, created_by, category, title, description, unit_number, status, updated_at, created_at
FROM complaints
WHERE id = $1
LIMIT 1;

-- name: ListComplaints :many
SELECT *
FROM complaints
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListTenantComplaints :many
SELECT *
FROM complaints
WHERE created_by = $1;

-- name: UpdateComplaint :exec
UPDATE complaints
SET
    created_by = $2,
    category = $3,
    title = $4,
    description = $5,
    unit_number = $6,
    status = $7,
    updated_at = now()
WHERE id = $1;

-- name: DeleteComplaint :exec
DELETE FROM complaints
WHERE id = $1;
