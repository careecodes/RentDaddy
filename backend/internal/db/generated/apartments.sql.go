// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.28.0
// source: apartments.sql

package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

const createApartment = `-- name: CreateApartment :one
INSERT INTO apartments (
    unit_number,
    price,
    size,
    management_id,
    availability,
    lease_id,
    created_at,
    updated_at
  ) VALUES ($1, $2, $3, $4, $5, $6, now(), now())
RETURNING id, unit_number, price, size, management_id, availability, lease_id, updated_at, created_at
`

type CreateApartmentParams struct {
	UnitNumber   int16          `json:"unit_number"`
	Price        pgtype.Numeric `json:"price"`
	Size         int16          `json:"size"`
	ManagementID int64          `json:"management_id"`
	Availability bool           `json:"availability"`
	LeaseID      pgtype.Int8    `json:"lease_id"`
}

func (q *Queries) CreateApartment(ctx context.Context, arg CreateApartmentParams) (Apartment, error) {
	row := q.db.QueryRow(ctx, createApartment,
		arg.UnitNumber,
		arg.Price,
		arg.Size,
		arg.ManagementID,
		arg.Availability,
		arg.LeaseID,
	)
	var i Apartment
	err := row.Scan(
		&i.ID,
		&i.UnitNumber,
		&i.Price,
		&i.Size,
		&i.ManagementID,
		&i.Availability,
		&i.LeaseID,
		&i.UpdatedAt,
		&i.CreatedAt,
	)
	return i, err
}

const deleteApartment = `-- name: DeleteApartment :exec
DELETE FROM apartments
WHERE id = $1
`

func (q *Queries) DeleteApartment(ctx context.Context, id int64) error {
	_, err := q.db.Exec(ctx, deleteApartment, id)
	return err
}

const getApartment = `-- name: GetApartment :one
SELECT id,
  unit_number,
  price,
  size,
  management_id,
  availability,
  lease_id
FROM apartments
WHERE id = $1
LIMIT 1
`

type GetApartmentRow struct {
	ID           int64          `json:"id"`
	UnitNumber   int16          `json:"unit_number"`
	Price        pgtype.Numeric `json:"price"`
	Size         int16          `json:"size"`
	ManagementID int64          `json:"management_id"`
	Availability bool           `json:"availability"`
	LeaseID      pgtype.Int8    `json:"lease_id"`
}

func (q *Queries) GetApartment(ctx context.Context, id int64) (GetApartmentRow, error) {
	row := q.db.QueryRow(ctx, getApartment, id)
	var i GetApartmentRow
	err := row.Scan(
		&i.ID,
		&i.UnitNumber,
		&i.Price,
		&i.Size,
		&i.ManagementID,
		&i.Availability,
		&i.LeaseID,
	)
	return i, err
}

const getApartmentByUnitNumber = `-- name: GetApartmentByUnitNumber :one
SELECT id 
FROM apartments
WHERE unit_number = $1
`

func (q *Queries) GetApartmentByUnitNumber(ctx context.Context, unitNumber int16) (int64, error) {
	row := q.db.QueryRow(ctx, getApartmentByUnitNumber, unitNumber)
	var id int64
	err := row.Scan(&id)
	return id, err
}

const getApartmentsWithoutLease = `-- name: GetApartmentsWithoutLease :many
SELECT 
  id,
  unit_number,
  price,
  size,
  management_id,
  availability
FROM apartments
WHERE 
  id NOT IN (
    SELECT apartment_id FROM leases 
    WHERE status = 'active' AND apartment_id IS NOT NULL
  )
  AND availability = true
ORDER BY unit_number ASC
`

type GetApartmentsWithoutLeaseRow struct {
	ID           int64          `json:"id"`
	UnitNumber   int16          `json:"unit_number"`
	Price        pgtype.Numeric `json:"price"`
	Size         int16          `json:"size"`
	ManagementID int64          `json:"management_id"`
	Availability bool           `json:"availability"`
}

func (q *Queries) GetApartmentsWithoutLease(ctx context.Context) ([]GetApartmentsWithoutLeaseRow, error) {
	rows, err := q.db.Query(ctx, getApartmentsWithoutLease)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []GetApartmentsWithoutLeaseRow
	for rows.Next() {
		var i GetApartmentsWithoutLeaseRow
		if err := rows.Scan(
			&i.ID,
			&i.UnitNumber,
			&i.Price,
			&i.Size,
			&i.ManagementID,
			&i.Availability,
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

const listApartments = `-- name: ListApartments :many
SELECT id,
  unit_number,
  price,
  size,
  management_id,
  availability,
  lease_id
FROM apartments
ORDER BY unit_number DESC
`

type ListApartmentsRow struct {
	ID           int64          `json:"id"`
	UnitNumber   int16          `json:"unit_number"`
	Price        pgtype.Numeric `json:"price"`
	Size         int16          `json:"size"`
	ManagementID int64          `json:"management_id"`
	Availability bool           `json:"availability"`
	LeaseID      pgtype.Int8    `json:"lease_id"`
}

func (q *Queries) ListApartments(ctx context.Context) ([]ListApartmentsRow, error) {
	rows, err := q.db.Query(ctx, listApartments)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListApartmentsRow
	for rows.Next() {
		var i ListApartmentsRow
		if err := rows.Scan(
			&i.ID,
			&i.UnitNumber,
			&i.Price,
			&i.Size,
			&i.ManagementID,
			&i.Availability,
			&i.LeaseID,
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

const listApartmentsWithoutLease = `-- name: ListApartmentsWithoutLease :many
SELECT id,
  unit_number,
  price,
  size,
  management_id,
  availability,
  lease_id
FROM apartments
ORDER BY unit_number DESC
LIMIT $1 OFFSET $2
`

type ListApartmentsWithoutLeaseParams struct {
	Limit  int32 `json:"limit"`
	Offset int32 `json:"offset"`
}

type ListApartmentsWithoutLeaseRow struct {
	ID           int64          `json:"id"`
	UnitNumber   int16          `json:"unit_number"`
	Price        pgtype.Numeric `json:"price"`
	Size         int16          `json:"size"`
	ManagementID int64          `json:"management_id"`
	Availability bool           `json:"availability"`
	LeaseID      pgtype.Int8    `json:"lease_id"`
}

func (q *Queries) ListApartmentsWithoutLease(ctx context.Context, arg ListApartmentsWithoutLeaseParams) ([]ListApartmentsWithoutLeaseRow, error) {
	rows, err := q.db.Query(ctx, listApartmentsWithoutLease, arg.Limit, arg.Offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []ListApartmentsWithoutLeaseRow
	for rows.Next() {
		var i ListApartmentsWithoutLeaseRow
		if err := rows.Scan(
			&i.ID,
			&i.UnitNumber,
			&i.Price,
			&i.Size,
			&i.ManagementID,
			&i.Availability,
			&i.LeaseID,
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

const updateApartment = `-- name: UpdateApartment :exec
UPDATE apartments
SET price = $2,
  management_id = $3,
  availability = $4,
  lease_id = $5,
  updated_at = now()
WHERE id = $1
`

type UpdateApartmentParams struct {
	ID           int64          `json:"id"`
	Price        pgtype.Numeric `json:"price"`
	ManagementID int64          `json:"management_id"`
	Availability bool           `json:"availability"`
	LeaseID      pgtype.Int8    `json:"lease_id"`
}

func (q *Queries) UpdateApartment(ctx context.Context, arg UpdateApartmentParams) error {
	_, err := q.db.Exec(ctx, updateApartment,
		arg.ID,
		arg.Price,
		arg.ManagementID,
		arg.Availability,
		arg.LeaseID,
	)
	return err
}
