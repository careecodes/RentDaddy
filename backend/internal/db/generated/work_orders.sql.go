// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.28.0
// source: work_orders.sql

package db

import (
	"context"
)

const countWorkOrdersByUser = `-- name: CountWorkOrdersByUser :one
SELECT COUNT(*)
FROM work_orders
WHERE created_by = $1
`

func (q *Queries) CountWorkOrdersByUser(ctx context.Context, createdBy int64) (int64, error) {
	row := q.db.QueryRow(ctx, countWorkOrdersByUser, createdBy)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const createWorkOrder = `-- name: CreateWorkOrder :one
INSERT INTO work_orders (
    created_by,
    category,
    title,
    description,
    unit_number
  )
VALUES ($1, $2, $3, $4, $5)
RETURNING id, created_by, category, title, description, unit_number, status, updated_at, created_at
`

type CreateWorkOrderParams struct {
	CreatedBy   int64        `json:"created_by"`
	Category    WorkCategory `json:"category"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	UnitNumber  int16        `json:"unit_number"`
}

func (q *Queries) CreateWorkOrder(ctx context.Context, arg CreateWorkOrderParams) (WorkOrder, error) {
	row := q.db.QueryRow(ctx, createWorkOrder,
		arg.CreatedBy,
		arg.Category,
		arg.Title,
		arg.Description,
		arg.UnitNumber,
	)
	var i WorkOrder
	err := row.Scan(
		&i.ID,
		&i.CreatedBy,
		&i.Category,
		&i.Title,
		&i.Description,
		&i.UnitNumber,
		&i.Status,
		&i.UpdatedAt,
		&i.CreatedAt,
	)
	return i, err
}

const deleteWorkOrder = `-- name: DeleteWorkOrder :exec
DELETE FROM work_orders
WHERE id = $1
`

func (q *Queries) DeleteWorkOrder(ctx context.Context, id int64) error {
	_, err := q.db.Exec(ctx, deleteWorkOrder, id)
	return err
}

const getWorkOrder = `-- name: GetWorkOrder :one
SELECT id, created_by,category, title, description, unit_number, status, updated_at, created_at
FROM work_orders
WHERE id = $1
LIMIT 1
`

func (q *Queries) GetWorkOrder(ctx context.Context, id int64) (WorkOrder, error) {
	row := q.db.QueryRow(ctx, getWorkOrder, id)
	var i WorkOrder
	err := row.Scan(
		&i.ID,
		&i.CreatedBy,
		&i.Category,
		&i.Title,
		&i.Description,
		&i.UnitNumber,
		&i.Status,
		&i.UpdatedAt,
		&i.CreatedAt,
	)
	return i, err
}

const listTenantWorkOrders = `-- name: ListTenantWorkOrders :many
SELECT id, created_by, category, title, description, unit_number, status, updated_at, created_at
FROM work_orders
WHERE created_by = $1
`

func (q *Queries) ListTenantWorkOrders(ctx context.Context, createdBy int64) ([]WorkOrder, error) {
	rows, err := q.db.Query(ctx, listTenantWorkOrders, createdBy)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WorkOrder
	for rows.Next() {
		var i WorkOrder
		if err := rows.Scan(
			&i.ID,
			&i.CreatedBy,
			&i.Category,
			&i.Title,
			&i.Description,
			&i.UnitNumber,
			&i.Status,
			&i.UpdatedAt,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listWorkOrders = `-- name: ListWorkOrders :many
SELECT id, created_by, category, title, description, unit_number, status, updated_at, created_at
FROM work_orders
ORDER BY created_at DESC
`

func (q *Queries) ListWorkOrders(ctx context.Context) ([]WorkOrder, error) {
	rows, err := q.db.Query(ctx, listWorkOrders)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WorkOrder
	for rows.Next() {
		var i WorkOrder
		if err := rows.Scan(
			&i.ID,
			&i.CreatedBy,
			&i.Category,
			&i.Title,
			&i.Description,
			&i.UnitNumber,
			&i.Status,
			&i.UpdatedAt,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const listWorkOrdersByUser = `-- name: ListWorkOrdersByUser :many
SELECT id, created_by, category, title, description, unit_number, status, updated_at, created_at
FROM work_orders
WHERE created_by = $1
ORDER BY created_at DESC
`

func (q *Queries) ListWorkOrdersByUser(ctx context.Context, createdBy int64) ([]WorkOrder, error) {
	rows, err := q.db.Query(ctx, listWorkOrdersByUser, createdBy)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []WorkOrder
	for rows.Next() {
		var i WorkOrder
		if err := rows.Scan(
			&i.ID,
			&i.CreatedBy,
			&i.Category,
			&i.Title,
			&i.Description,
			&i.UnitNumber,
			&i.Status,
			&i.UpdatedAt,
			&i.CreatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const updateWorkOrder = `-- name: UpdateWorkOrder :exec
UPDATE work_orders
SET
    category = $2,
    title = $3,
    description = $4,
    unit_number = $5,
    status = $6,
    updated_at = now()
WHERE id = $1
`

type UpdateWorkOrderParams struct {
	ID          int64        `json:"id"`
	Category    WorkCategory `json:"category"`
	Title       string       `json:"title"`
	Description string       `json:"description"`
	UnitNumber  int16        `json:"unit_number"`
	Status      Status       `json:"status"`
}

func (q *Queries) UpdateWorkOrder(ctx context.Context, arg UpdateWorkOrderParams) error {
	_, err := q.db.Exec(ctx, updateWorkOrder,
		arg.ID,
		arg.Category,
		arg.Title,
		arg.Description,
		arg.UnitNumber,
		arg.Status,
	)
	return err
}
