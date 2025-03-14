-- name: UpdateLockerUser :exec
UPDATE lockers
SET user_id = $2, in_use = $3
WHERE id = $1;

-- name: UpdateAccessCode :exec
UPDATE lockers
SET access_code = $2
WHERE id = $1;

-- name: GetLockers :many
SELECT *
FROM lockers
ORDER BY id DESC
LIMIT $1 OFFSET $2;

-- name: GetLocker :one
SELECT *
FROM lockers
WHERE id = $1
LIMIT 1;