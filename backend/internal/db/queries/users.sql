-- name: CreateUser :one
INSERT INTO users (
    clerk_id,
    first_name,
    last_name,
    email,
    phone,
    unit_number,
    image_url,
    role
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING id, clerk_id, first_name, last_name, email, phone, unit_number,role, created_at;


-- name: GetUser :one
SELECT id, clerk_id, first_name, last_name, email, phone, role, unit_number, status, created_at
FROM users
WHERE clerk_id = $1
LIMIT 1;

-- name: ListUsersByRole :many
SELECT id, clerk_id, first_name, last_name, email, phone, role, unit_number, status, created_at
FROM users
WHERE role = $1
ORDER BY created_at DESC;

-- name: UpdateUser :exec
UPDATE users
SET first_name = $2, last_name = $3, email = $4, phone = $5, image_url = $6
WHERE clerk_id = $1;

-- name: DeleteUser :exec
DELETE FROM users
WHERE clerk_id = $1;



