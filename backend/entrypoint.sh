#!/bin/sh
set -e

echo "Waiting for PostgreSQL to be ready..."
echo "postgres:5432:${POSTGRES_DB}:${POSTGRES_USER}:${POSTGRES_PASSWORD}" > ~/.pgpass
chmod 600 ~/.pgpass
export PGPASSFILE=~/.pgpass

until PGPASSWORD="$POSTGRES_PASSWORD" psql -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q'; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "Running database migrations..."
task migrate:up || echo "Migration failed!"

# Start cron in background
crond

# Make sure the pre-built binary has proper permissions
chmod +x /app/tmp/server

# Configure ngrok (if auth token is provided)
if [ -n "${NGROK_AUTH_TOKEN}" ]; then
  echo "Configuring ngrok with provided auth token"
  ngrok config add-authtoken ${NGROK_AUTH_TOKEN}
  
  # Start ngrok in the background
  echo "Starting ngrok in the background..."
  ngrok http 8080 > /app/temp/ngrok.log 2>&1 &
  
  # Wait a few seconds for ngrok to initialize
  sleep 5
  
  # Try to extract and display the ngrok URL
  echo "Checking for ngrok URL..."
  grep -o "https://.*\.ngrok\.io" /app/temp/ngrok.log || echo "Ngrok URL not found yet, check logs later"
fi

# Choose whether to use Air for development or direct execution
if [ "${USE_AIR:-true}" = "true" ]; then
  echo "Starting Air with pre-built binary..."
  exec air -c /app/.air.toml
else
  echo "Starting the server directly..."
  exec /app/tmp/server
fi