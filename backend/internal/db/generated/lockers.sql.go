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
    user_id
) VALUES (
    $1, $2
)
`

type CreateLockerParams struct {
	AccessCode pgtype.Text `json:"access_code"`
	UserID     pgtype.Int8 `json:"user_id"`
}

func (q *Queries) CreateLocker(ctx context.Context, arg CreateLockerParams) error {
	_, err := q.db.Exec(ctx, createLocker, arg.AccessCode, arg.UserID)
	return err
}

const createManyLockers = `-- name: CreateManyLockers :execrows
INSERT INTO lockers (
    access_code,
    user_id,
    in_use
)
SELECT 
    NULL::text,
    NULL::bigint,             -- default null user_id, explicitly cast to bigint (not sure if I need to change this to string, since the Clerk UserId is a string)
    false                     -- default to not in use
FROM generate_series(1, $1::int)
`

func (q *Queries) CreateManyLockers(ctx context.Context, count int32) (int64, error) {
	result, err := q.db.Exec(ctx, createManyLockers, count)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected(), nil
}

const getAvailableLocker = `-- name: GetAvailableLocker :one
SELECT id, access_code, in_use, user_id
FROM lockers
WHERE in_use = false
`

func (q *Queries) GetAvailableLocker(ctx context.Context) (Locker, error) {
	row := q.db.QueryRow(ctx, getAvailableLocker)
	var i Locker
	err := row.Scan(
		&i.ID,
		&i.AccessCode,
		&i.InUse,
		&i.UserID,
	)
	return i, err
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

const getLockerByUserId = `-- name: GetLockerByUserId :one
SELECT id, access_code, in_use, user_id
FROM lockers
WHERE user_id = $1
LIMIT 1
`

func (q *Queries) GetLockerByUserId(ctx context.Context, userID pgtype.Int8) (Locker, error) {
	row := q.db.QueryRow(ctx, getLockerByUserId, userID)
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
`

func (q *Queries) GetLockers(ctx context.Context) ([]Locker, error) {
	rows, err := q.db.Query(ctx, getLockers)
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

const getLockersByUserId = `-- name: GetLockersByUserId :many
SELECT id, access_code, in_use, user_id
FROM lockers
WHERE user_id = $1
`

func (q *Queries) GetLockersByUserId(ctx context.Context, userID pgtype.Int8) ([]Locker, error) {
	rows, err := q.db.Query(ctx, getLockersByUserId, userID)
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

const getNumberOfLockersInUse = `-- name: GetNumberOfLockersInUse :one
SELECT COUNT(*)
FROM lockers
WHERE in_use = true
`

func (q *Queries) GetNumberOfLockersInUse(ctx context.Context) (int64, error) {
	row := q.db.QueryRow(ctx, getNumberOfLockersInUse)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const unlockUserLockers = `-- name: UnlockUserLockers :exec

UPDATE lockers
SET user_id = null, access_code= null, in_use = false
WHERE user_id = $1
`

// Used the sqlc.arg to help create the amount of lockers we pass in (1 through "count")
func (q *Queries) UnlockUserLockers(ctx context.Context, userID pgtype.Int8) error {
	_, err := q.db.Exec(ctx, unlockUserLockers, userID)
	return err
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

const updateLockerInUse = `-- name: UpdateLockerInUse :exec
UPDATE lockers
SET user_id = $2, access_code = $3, in_use = true
WHERE id = $1
`

type UpdateLockerInUseParams struct {
	ID         int64       `json:"id"`
	UserID     pgtype.Int8 `json:"user_id"`
	AccessCode pgtype.Text `json:"access_code"`
}

func (q *Queries) UpdateLockerInUse(ctx context.Context, arg UpdateLockerInUseParams) error {
	_, err := q.db.Exec(ctx, updateLockerInUse, arg.ID, arg.UserID, arg.AccessCode)
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
