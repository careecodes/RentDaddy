#!/bin/sh
set -e
echo "[DEBUG] entrypoint reached"
which task || echo "task not found"
ls -alh /usr/local/bin
ls -alh .
env | grep PG
sleep 120


echo "[ENTRYPOINT] Backend starting..."
echo "[ENTRYPOINT] POSTGRES_HOST: $POSTGRES_HOST"
echo "[ENTRYPOINT] POSTGRES_USER: $POSTGRES_USER"
echo "[ENTRYPOINT] PORT: $PORT"
echo "[ENTRYPOINT] Running migrations and app..."



export PG_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DB}?sslmode=disable"

echo "Waiting for PostgreSQL to be ready..."
echo "postgresql:5432:${POSTGRES_DB}:${POSTGRES_USER}:${POSTGRES_PASSWORD}" > ~/.pgpass
chmod 600 ~/.pgpass
export PGPASSFILE=~/.pgpass

until PGPASSWORD="$POSTGRES_PASSWORD" psql -h ${POSTGRES_HOST} -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q'; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "Running database migrations..."
task migrate:up || echo "Migration failed!"
echo "Database migrations complete."

if [ "$DEBUG_MODE" = "true" ]; then
  echo "Debug mode enabled. Container will stay alive."
  # Debugging: Show working directory and files
  echo "Current directory: $(pwd)"
  ls -lah
  tail -f /dev/null
else
  # Run Air with config file
  echo "Starting Air..."
  exec air -c /app/.air.toml
  # Starting backend server
  echo "Starting the backend server..."
  chmod -R 777 /tmp/server
  exec /tmp/server
fi
