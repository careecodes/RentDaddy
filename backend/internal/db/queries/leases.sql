-- name: CreateLease :one
INSERT INTO lease (document_id, user_id, status, start_time, end_time)
VALUES ($1, $2, 'active', $3, $4)
RETURNING *;

-- name: RenewLease :one
UPDATE lease
SET end_time = $1, updated_at = now()
WHERE id = $2 AND status = 'active'
RETURNING *;

-- name: TerminateLease :one
UPDATE lease
SET status = 'terminated', updated_at = now()
WHERE id = $1
RETURNING *;
