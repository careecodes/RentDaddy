-- name: CreateWorkOrder :one
INSERT INTO work_orders (
    created_by,
    order_number,
    category,
    title,
    description,
    unit_number,
    status,
    updated_at,
    created_at
  )
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *;

-- name: GetWorkOrder :one
SELECT id, created_by, order_number, category, title, description, unit_number, status, updated_at, created_at
FROM work_orders
WHERE id = $1
LIMIT 1;

-- name: ListWorkOrders :many
SELECT *
FROM work_orders
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: UpdateWorkOrder :exec
UPDATE work_orders
SET
    created_by = $2,
    order_number = $3,
    category = $4,
    title = $5,
    description = $6,
    unit_number = $7,
    status = $8,
    updated_at = $9,
    created_at = $10
WHERE id = $1;

-- name: DeleteWorkOrder :exec
DELETE FROM work_orders
WHERE id = $1;
