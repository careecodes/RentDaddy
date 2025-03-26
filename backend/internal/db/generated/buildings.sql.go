// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.28.0
// source: buildings.sql

package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

const createBuilding = `-- name: CreateBuilding :one
INSERT INTO buildings (
    building_number,
    management_id,
    manager_email,
    manager_phone,
    apartments,
    parking_total,
    per_user_parking,
    created_at,
    updated_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
RETURNING id, building_number, parking_total, per_user_parking, management_id, manager_phone, manager_email, apartments, created_at, updated_at
`

type CreateBuildingParams struct {
	BuildingNumber int16       `json:"building_number"`
	ManagementID   int64       `json:"management_id"`
	ManagerEmail   pgtype.Text `json:"manager_email"`
	ManagerPhone   pgtype.Text `json:"manager_phone"`
	Apartments     int64       `json:"apartments"`
	ParkingTotal   pgtype.Int8 `json:"parking_total"`
	PerUserParking pgtype.Int8 `json:"per_user_parking"`
}

func (q *Queries) CreateBuilding(ctx context.Context, arg CreateBuildingParams) (Building, error) {
	row := q.db.QueryRow(ctx, createBuilding,
		arg.BuildingNumber,
		arg.ManagementID,
		arg.ManagerEmail,
		arg.ManagerPhone,
		arg.Apartments,
		arg.ParkingTotal,
		arg.PerUserParking,
	)
	var i Building
	err := row.Scan(
		&i.ID,
		&i.BuildingNumber,
		&i.ParkingTotal,
		&i.PerUserParking,
		&i.ManagementID,
		&i.ManagerPhone,
		&i.ManagerEmail,
		&i.Apartments,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}

const getBuilding = `-- name: GetBuilding :one
SELECT id, building_number, parking_total, per_user_parking, management_id, manager_phone, manager_email, apartments, created_at, updated_at
FROM buildings
WHERE id = $1
LIMIT 1
`

func (q *Queries) GetBuilding(ctx context.Context, id int64) (Building, error) {
	row := q.db.QueryRow(ctx, getBuilding, id)
	var i Building
	err := row.Scan(
		&i.ID,
		&i.BuildingNumber,
		&i.ParkingTotal,
		&i.PerUserParking,
		&i.ManagementID,
		&i.ManagerPhone,
		&i.ManagerEmail,
		&i.Apartments,
		&i.CreatedAt,
		&i.UpdatedAt,
	)
	return i, err
}
