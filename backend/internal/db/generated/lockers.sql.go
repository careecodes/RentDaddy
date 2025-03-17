// Code generated by sqlc. DO NOT EDIT.
// versions:
//   sqlc v1.28.0
// source: lockers.sql

package db

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

const createLocker = `-- name: CreateLocker :exec
INSERT INTO lockers (
    access_code,
    user_id,
    in_use
) VALUES (
    $1, $2, $3
)
`

type CreateLockerParams struct {
	AccessCode pgtype.Text `json:"access_code"`
	UserID     pgtype.Int8 `json:"user_id"`
	InUse      bool        `json:"in_use"`
}

func (q *Queries) CreateLocker(ctx context.Context, arg CreateLockerParams) error {
	_, err := q.db.Exec(ctx, createLocker, arg.AccessCode, arg.UserID, arg.InUse)
	return err
}

const getLocker = `-- name: GetLocker :one
SELECT id, access_code, in_use, user_id
FROM lockers
WHERE id = $1
LIMIT 1
`

func (q *Queries) GetLocker(ctx context.Context, id int64) (Locker, error) {
	row := q.db.QueryRow(ctx, getLocker, id)
	var i Locker
	err := row.Scan(
		&i.ID,
		&i.AccessCode,
		&i.InUse,
		&i.UserID,
	)
	return i, err
}

const getLockers = `-- name: GetLockers :many
SELECT id, access_code, in_use, user_id
FROM lockers
ORDER BY id DESC
LIMIT $1 OFFSET $2
`

type GetLockersParams struct {
	Limit  int32 `json:"limit"`
	Offset int32 `json:"offset"`
}

func (q *Queries) GetLockers(ctx context.Context, arg GetLockersParams) ([]Locker, error) {
	rows, err := q.db.Query(ctx, getLockers, arg.Limit, arg.Offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Locker
	for rows.Next() {
		var i Locker
		if err := rows.Scan(
			&i.ID,
			&i.AccessCode,
			&i.InUse,
			&i.UserID,
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

const updateAccessCode = `-- name: UpdateAccessCode :exec
UPDATE lockers
SET access_code = $2
WHERE id = $1
`

type UpdateAccessCodeParams struct {
	ID         int64       `json:"id"`
	AccessCode pgtype.Text `json:"access_code"`
}

func (q *Queries) UpdateAccessCode(ctx context.Context, arg UpdateAccessCodeParams) error {
	_, err := q.db.Exec(ctx, updateAccessCode, arg.ID, arg.AccessCode)
	return err
}

const updateLockerUser = `-- name: UpdateLockerUser :exec
UPDATE lockers
SET user_id = $2, in_use = $3
WHERE id = $1
`

type UpdateLockerUserParams struct {
	ID     int64       `json:"id"`
	UserID pgtype.Int8 `json:"user_id"`
	InUse  bool        `json:"in_use"`
}

func (q *Queries) UpdateLockerUser(ctx context.Context, arg UpdateLockerUserParams) error {
	_, err := q.db.Exec(ctx, updateLockerUser, arg.ID, arg.UserID, arg.InUse)
	return err
}
