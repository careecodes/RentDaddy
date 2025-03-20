-- name: CreateLocker :exec
INSERT INTO lockers (
    access_code,
    user_id,
    in_use
) VALUES (
    $1, $2, $3
);

-- name: CreateManyLockers :execrows
INSERT INTO lockers (
    access_code,
    user_id,
    in_use
)
SELECT 
    NULL::text,
    NULL::bigint,             -- default null user_id, explicitly cast to bigint (not sure if I need to change this to string, since the Clerk UserId is a string)
    false                     -- default to not in use
FROM generate_series(1, sqlc.arg(count)::int); -- Used the sqlc.arg to help create the amount of lockers we pass in (1 through "count")

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
LIMIT (SELECT COUNT(*) FROM lockers);

-- name: GetLocker :one
SELECT *
FROM lockers
WHERE id = $1
LIMIT 1;

-- name: GetLockerByUserId :one
SELECT *
FROM lockers
WHERE user_id = $1
LIMIT 1;

