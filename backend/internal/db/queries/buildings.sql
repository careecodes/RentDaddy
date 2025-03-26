-- name: GetBuilding :one
SELECT *
FROM buildings
WHERE id = $1
LIMIT 1;

-- name: CreateBuilding :one
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
RETURNING *;
