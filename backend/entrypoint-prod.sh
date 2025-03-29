#!/bin/sh
set -e
echo "🔥 entrypoint-prod.sh running at $(date)"

echo "[ENTRYPOINT] Attempting to connect to PostgreSQL with:"
echo "[ENTRYPOINT] Host: $POSTGRES_HOST"
echo "[ENTRYPOINT] User: $POSTGRES_USER"
echo "[ENTRYPOINT] Database: $POSTGRES_DB"
echo "[ENTRYPOINT] Connection string: postgresql://$POSTGRES_USER:***@$POSTGRES_HOST:${POSTGRES_PORT:-5432}/$POSTGRES_DB"

echo "[ENTRYPOINT] Checking for /tmp/server:"
ls -lh /tmp/server || echo "Backend binary not found!"

# If PG_URL not set, build it from components
if [ -z "$PG_URL" ]; then
  export PG_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT:-5432}/${POSTGRES_DB}?sslmode=disable"
  echo "[ENTRYPOINT] Built PG_URL: $PG_URL"
fi

# Wait for PostgreSQL to be ready
echo "[ENTRYPOINT] Waiting for PostgreSQL..."
echo "${POSTGRES_HOST}:5432:${POSTGRES_DB}:${POSTGRES_USER}:${POSTGRES_PASSWORD}" > ~/.pgpass
chmod 600 ~/.pgpass
export PGPASSFILE=~/.pgpass


until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "[ENTRYPOINT] PostgreSQL is unavailable - sleeping..."
  sleep 2
done

echo "[ENTRYPOINT] PostgreSQL is ready!"

# Run migrations
echo "[ENTRYPOINT] Running database migrations..."
if ! task migrate:up; then
  echo "[ENTRYPOINT] ❌ Migration failed!"
else
  echo "[ENTRYPOINT] ✅ Migrations applied."
fi

# Start the app
if [ "$DEBUG_MODE" = "true" ]; then
  echo "[ENTRYPOINT] Debug mode enabled. Keeping container alive."
  tail -f /dev/null
else
  echo "[ENTRYPOINT] Starting backend server..."
  chmod +x /tmp/server
  /tmp/server || echo "Server crashed with exit code $?"
fi
