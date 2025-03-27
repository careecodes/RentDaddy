-- name: GetBuilding :one
SELECT *
FROM buildings
WHERE id = $1
LIMIT 1;

-- name: CreateBuilding :one
INSERT INTO buildings (
    parking_total,
    per_user_parking,
    management_id,
    created_at,
    updated_at
  ) VALUES ($1, $2, $3, now(), now())
RETURNING *;
