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
    building_id,
    management_id,
    availability,
    created_at,
    updated_at
  ) VALUES ($1, $2, $3, $4, $5, $6, now(), now())

RETURNING id, unit_number, building_id, price, size, management_id, availability, lease_id, updated_at, created_at
`

type CreateApartmentParams struct {
	UnitNumber   pgtype.Int8    `json:"unit_number"`
	Price        pgtype.Numeric `json:"price"`
	Size         pgtype.Int2    `json:"size"`
	BuildingID   int64          `json:"building_id"`
	ManagementID int64          `json:"management_id"`
	Availability bool           `json:"availability"`
}

func (q *Queries) CreateApartment(ctx context.Context, arg CreateApartmentParams) (Apartment, error) {
	row := q.db.QueryRow(ctx, createApartment,
		arg.UnitNumber,
		arg.Price,
		arg.Size,
		arg.BuildingID,
		arg.ManagementID,
		arg.Availability,
	)
	var i Apartment
	err := row.Scan(
		&i.ID,
		&i.UnitNumber,
		&i.BuildingID,
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
  availability
FROM apartments
WHERE id = $1
LIMIT 1
`

type GetApartmentRow struct {
	ID           int64          `json:"id"`
	UnitNumber   pgtype.Int8    `json:"unit_number"`
	Price        pgtype.Numeric `json:"price"`
	Size         pgtype.Int2    `json:"size"`
	ManagementID int64          `json:"management_id"`
	Availability bool           `json:"availability"`
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
	)
	return i, err
}

const getApartmentByUnitNumber = `-- name: GetApartmentByUnitNumber :one
SELECT id 
FROM apartments
WHERE unit_number = $1
`

func (q *Queries) GetApartmentByUnitNumber(ctx context.Context, unitNumber pgtype.Int8) (int64, error) {
	row := q.db.QueryRow(ctx, getApartmentByUnitNumber, unitNumber)
	var id int64
	err := row.Scan(&id)
	return id, err
}

const listApartments = `-- name: ListApartments :many
SELECT id,
  unit_number,
  price,
  size,
  management_id,
  availability
FROM apartments
ORDER BY unit_number DESC
`

type ListApartmentsRow struct {
	ID           int64          `json:"id"`
	UnitNumber   pgtype.Int8    `json:"unit_number"`
	Price        pgtype.Numeric `json:"price"`
	Size         pgtype.Int2    `json:"size"`
	ManagementID int64          `json:"management_id"`
	Availability bool           `json:"availability"`
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
  updated_at = now()
WHERE id = $1
`

type UpdateApartmentParams struct {
	ID           int64          `json:"id"`
	Price        pgtype.Numeric `json:"price"`
	ManagementID int64          `json:"management_id"`
	Availability bool           `json:"availability"`
}

func (q *Queries) UpdateApartment(ctx context.Context, arg UpdateApartmentParams) error {
	_, err := q.db.Exec(ctx, updateApartment,
		arg.ID,
		arg.Price,
		arg.ManagementID,
		arg.Availability,
	)
	return err
}
