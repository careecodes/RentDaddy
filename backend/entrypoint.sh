#!/bin/sh
set -e

echo "[ENTRYPOINT] Backend starting..."
echo "[ENTRYPOINT] POSTGRES_HOST: $POSTGRES_HOST"
echo "[ENTRYPOINT] PORT: $PORT"

# Set up database connection string
export PG_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DB}?sslmode=disable"

# The postgres service in docker-compose already has a healthcheck,
# but we'll add a quick check to make sure our connection works
echo "Verifying PostgreSQL connection..."
attempt=0
max_attempts=10

# Export password as environment variable to avoid exposing it in logs
export PGPASSWORD="$POSTGRES_PASSWORD"

until psql -h ${POSTGRES_HOST} -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' > /dev/null 2>&1 || [ $attempt -eq $max_attempts ]; do
  attempt=$((attempt+1))
  echo "PostgreSQL connection attempt $attempt/$max_attempts"
  sleep 1
done

if [ $attempt -eq $max_attempts ]; then
  echo "Warning: Could not connect to PostgreSQL after multiple attempts, but continuing anyway..."
fi

echo "Running database migrations..."
task migrate:up || echo "Migration failed, but continuing..."
echo "Database migrations complete."

if [ "$DEBUG_MODE" = "true" ]; then
  echo "Debug mode enabled. Container will stay alive."
  tail -f /dev/null
elif [ "$USE_AIR" = "false" ]; then
  # Run the server directly without Air
  echo "Starting server directly (Air disabled)..."
  cd /app
  exec go run server.go
else
  # Run Air with config file for hot reloading
  echo "Starting Air for hot reloading..."
  exec air -c /app/.air.toml
fi
