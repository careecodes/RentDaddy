#!/bin/sh
echo "[ENTRYPOINT] Starting backend container..."
echo "[ENTRYPOINT] PG_URL: $PG_URL"
echo "[ENTRYPOINT] POSTGRES_HOST: $POSTGRES_HOST"
echo "[ENTRYPOINT] POSTGRES_USER: $POSTGRES_USER"
echo "[ENTRYPOINT] POSTGRES_DB: $POSTGRES_DB"
echo "[ENTRYPOINT] PORT: $PORT"
echo "[ENTRYPOINT] DEBUG_MODE: $DEBUG_MODE"

echo "[ENTRYPOINT] Checking for /tmp/server:"
ls -lh /tmp/server || echo "Backend binary not found!"

# If PG_URL not set, build it from components
if [ -z "$PG_URL" ]; then
  export PG_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT:-5432}/${POSTGRES_DB}?sslmode=disable"
  echo "[ENTRYPOINT] Built PG_URL: $PG_URL"
fi

# Wait for PostgreSQL to be ready
echo "[ENTRYPOINT] Waiting for PostgreSQL..."
echo "postgresql:5432:${POSTGRES_DB}:${POSTGRES_USER}:${POSTGRES_PASSWORD}" > ~/.pgpass
chmod 600 ~/.pgpass
export PGPASSFILE=~/.pgpass

until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q'; do
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
