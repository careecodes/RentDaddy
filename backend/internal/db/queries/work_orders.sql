-- name: CreateWorkOrder :one
INSERT INTO work_orders (
    created_by,
    category,
    title,
    description,
    unit_number
  )
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetWorkOrder :one
SELECT id, created_by,category, title, description, unit_number, status, updated_at, created_at
FROM work_orders
WHERE id = $1
LIMIT 1;

-- name: ListWorkOrders :many
SELECT *
FROM work_orders
ORDER BY created_at DESC;

-- name: ListWorkOrdersByUser :many
SELECT *
FROM work_orders
WHERE created_by = $1
ORDER BY created_at DESC;

-- name: CountWorkOrdersByUser :one
SELECT COUNT(*)
FROM work_orders
WHERE created_by = $1;

-- name: ListTenantWorkOrders :many
SELECT *
FROM work_orders
WHERE created_by = $1;

-- name: UpdateWorkOrder :exec
UPDATE work_orders
SET
    category = $2,
    title = $3,
    description = $4,
    unit_number = $5,
    status = $6,
    updated_at = now()
WHERE id = $1;

-- name: UpdateWorkOrderStatus :exec
UPDATE work_orders
SET
    status = $2,
    updated_at = now()
WHERE id = $1;

-- name: DeleteWorkOrder :exec
DELETE FROM work_orders
WHERE id = $1;
