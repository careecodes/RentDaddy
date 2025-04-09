-- name: CreateLocker :exec
INSERT INTO lockers (
    access_code,
    user_id
) VALUES (
    $1, $2
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

-- name: UnlockUserLockers :exec 
UPDATE lockers
SET user_id = null, access_code = null, in_use = false
WHERE user_id = $1;

-- name: UnlockerLockersByIds :exec
UPDATE lockers 
SET user_id = null, access_code = null, in_use = false
WHERE id =  ANY($1::int[]);

-- name: UpdateLockerUser :exec
UPDATE lockers
SET user_id = $2, in_use = $3
WHERE id = $1;

-- name: UpdateLockerInUse :exec 
UPDATE lockers
SET user_id = $2, access_code = $3, in_use = true
WHERE id = $1;

-- name: UpdateAccessCode :exec
UPDATE lockers
SET access_code = $2
WHERE id = $1;

-- name: GetLockers :many
SELECT *
FROM lockers
ORDER BY id DESC;

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

-- name: GetLockersByUserId :many
SELECT *
FROM lockers
WHERE user_id = $1;

-- name: CountLockersByUser :one
SELECT COUNT(*)
FROM lockers
WHERE user_id = $1;


-- name: GetNumberOfLockersInUse :one
SELECT COUNT(*)
FROM lockers
WHERE in_use = true;

-- name: GetAvailableLocker :one 
SELECT *
FROM lockers
WHERE in_use = false;

-- name: DeleteLockersByIds :exec 
DELETE FROM lockers
WHERE id =  ANY($1::int[]);
