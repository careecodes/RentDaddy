// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.28.0
// source: complaints.sql

package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

const createComplaint = `-- name: CreateComplaint :one
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
RETURNING id, complaint_number, created_by, category, title, description, unit_number, status, updated_at, created_at
`

type CreateComplaintParams struct {
	ComplaintNumber int64             `json:"complaint_number"`
	CreatedBy       int64             `json:"created_by"`
	Category        ComplaintCategory `json:"category"`
	Title           string            `json:"title"`
	Description     string            `json:"description"`
	UnitNumber      pgtype.Int8       `json:"unit_number"`
	Status          Status            `json:"status"`
}

func (q *Queries) CreateComplaint(ctx context.Context, arg CreateComplaintParams) (Complaint, error) {
	row := q.db.QueryRow(ctx, createComplaint,
		arg.ComplaintNumber,
		arg.CreatedBy,
		arg.Category,
		arg.Title,
		arg.Description,
		arg.UnitNumber,
		arg.Status,
	)
	var i Complaint
	err := row.Scan(
		&i.ID,
		&i.ComplaintNumber,
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

const deleteComplaint = `-- name: DeleteComplaint :exec
DELETE FROM complaints
WHERE id = $1
`

func (q *Queries) DeleteComplaint(ctx context.Context, id int64) error {
	_, err := q.db.Exec(ctx, deleteComplaint, id)
	return err
}

const getComplaint = `-- name: GetComplaint :one
SELECT id, created_by, complaint_number, category, title, description, unit_number, status, updated_at, created_at
FROM complaints
WHERE id = $1
LIMIT 1
`

type GetComplaintRow struct {
	ID              int64             `json:"id"`
	CreatedBy       int64             `json:"created_by"`
	ComplaintNumber int64             `json:"complaint_number"`
	Category        ComplaintCategory `json:"category"`
	Title           string            `json:"title"`
	Description     string            `json:"description"`
	UnitNumber      pgtype.Int8       `json:"unit_number"`
	Status          Status            `json:"status"`
	UpdatedAt       pgtype.Timestamp  `json:"updated_at"`
	CreatedAt       pgtype.Timestamp  `json:"created_at"`
}

func (q *Queries) GetComplaint(ctx context.Context, id int64) (GetComplaintRow, error) {
	row := q.db.QueryRow(ctx, getComplaint, id)
	var i GetComplaintRow
	err := row.Scan(
		&i.ID,
		&i.CreatedBy,
		&i.ComplaintNumber,
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

const listComplaints = `-- name: ListComplaints :many
SELECT id, complaint_number, created_by, category, title, description, unit_number, status, updated_at, created_at
FROM complaints
ORDER BY created_at DESC
LIMIT $1 OFFSET $2
`

type ListComplaintsParams struct {
	Limit  int32 `json:"limit"`
	Offset int32 `json:"offset"`
}

func (q *Queries) ListComplaints(ctx context.Context, arg ListComplaintsParams) ([]Complaint, error) {
	rows, err := q.db.Query(ctx, listComplaints, arg.Limit, arg.Offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Complaint
	for rows.Next() {
		var i Complaint
		if err := rows.Scan(
			&i.ID,
			&i.ComplaintNumber,
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

const listTenantComplaints = `-- name: ListTenantComplaints :many
SELECT id, complaint_number, created_by, category, title, description, unit_number, status, updated_at, created_at
FROM complaints
WHERE created_by = $1
`

func (q *Queries) ListTenantComplaints(ctx context.Context, createdBy int64) ([]Complaint, error) {
	rows, err := q.db.Query(ctx, listTenantComplaints, createdBy)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Complaint
	for rows.Next() {
		var i Complaint
		if err := rows.Scan(
			&i.ID,
			&i.ComplaintNumber,
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

const updateComplaint = `-- name: UpdateComplaint :exec
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
WHERE id = $1
`

type UpdateComplaintParams struct {
	ID              int64             `json:"id"`
	CreatedBy       int64             `json:"created_by"`
	ComplaintNumber int64             `json:"complaint_number"`
	Category        ComplaintCategory `json:"category"`
	Title           string            `json:"title"`
	Description     string            `json:"description"`
	UnitNumber      pgtype.Int8       `json:"unit_number"`
	Status          Status            `json:"status"`
}

func (q *Queries) UpdateComplaint(ctx context.Context, arg UpdateComplaintParams) error {
	_, err := q.db.Exec(ctx, updateComplaint,
		arg.ID,
		arg.CreatedBy,
		arg.ComplaintNumber,
		arg.Category,
		arg.Title,
		arg.Description,
		arg.UnitNumber,
		arg.Status,
	)
	return err
}

const updateComplaintStatus = `-- name: UpdateComplaintStatus :exec
UPDATE complaints
SET
  status = $2,
  updated_at = now()
WHERE id = $1
`

type UpdateComplaintStatusParams struct {
	ID     int64  `json:"id"`
	Status Status `json:"status"`
}

func (q *Queries) UpdateComplaintStatus(ctx context.Context, arg UpdateComplaintStatusParams) error {
	_, err := q.db.Exec(ctx, updateComplaintStatus, arg.ID, arg.Status)
	return err
}
