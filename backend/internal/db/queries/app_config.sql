-- name: GetConfigByKey :one
SELECT * FROM app_config
WHERE key = $1
LIMIT 1;

-- name: GetAllConfig :many
SELECT * FROM app_config
ORDER BY key;

-- name: UpsertConfig :one
INSERT INTO app_config (key, value, description, user_id)
VALUES ($1, $2, $3, $4)
ON CONFLICT (key) 
DO UPDATE SET 
    value = $2,
    description = $3,
    user_id = $4,
    updated_at = now()
RETURNING *;

-- name: DeleteConfig :exec
DELETE FROM app_config
WHERE key = $1;