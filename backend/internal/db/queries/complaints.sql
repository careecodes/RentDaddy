-- name: CreateComplaint :one
INSERT INTO complaints (
    complaint_number,
    created_by,
    category,
    title,
    description,
    unit_number,
    status
  )
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetComplaint :one
SELECT id, created_by, complaint_number, category, title, description, unit_number, status, updated_at, created_at
FROM complaints
WHERE id = $1
LIMIT 1;

-- name: ListComplaints :many
SELECT *
FROM complaints
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: UpdateComplaint :exec
UPDATE complaints
SET
    created_by = $2,
    complaint_number = $3,
    category = $4,
    title = $5,
    description = $6,
    unit_number = $7,
    status = $8,
    updated_at = now()
WHERE id = $1;

-- name: DeleteComplaint :exec
DELETE FROM complaints
WHERE id = $1;