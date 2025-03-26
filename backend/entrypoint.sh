#!/bin/sh
set -e
export PG_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}?sslmode=disable"

echo "Waiting for PostgreSQL to be ready..."
echo "postgres:5432:${POSTGRES_DB}:${POSTGRES_USER}:${POSTGRES_PASSWORD}" > ~/.pgpass
chmod 600 ~/.pgpass
export PGPASSFILE=~/.pgpass
export PG_URL=postgresql://appuser:apppassword@localhost:5432/appdb
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h localhost -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q'; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "Running database migrations..."
task migrate:up || echo "Migration failed!"

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
