#!/bin/sh
set -e

echo "[ENTRYPOINT-PROD] Backend starting..."

# In production, environment variables should be provided by the environment
# (e.g., container platform, Kubernetes, etc.)

echo "[ENTRYPOINT-PROD] POSTGRES_HOST: $POSTGRES_HOST"
echo "[ENTRYPOINT-PROD] POSTGRES_USER: $POSTGRES_USER"
echo "[ENTRYPOINT-PROD] POSTGRES_DB: $POSTGRES_DB"
echo "[ENTRYPOINT-PROD] PORT: $PORT"

# Set up database connection string
export PG_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DB}?sslmode=disable"

# The postgres service in docker-compose already has a healthcheck,
# but we'll add a quick check to make sure our connection works
echo "Verifying PostgreSQL connection..."
attempt=0
max_attempts=30

# First try connecting to postgres default database to ensure the server is up
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h ${POSTGRES_HOST} -U "$POSTGRES_USER" -d "postgres" -c '\q' > /dev/null 2>&1 || [ $attempt -eq $max_attempts ]; do
  attempt=$((attempt+1))
  echo "PostgreSQL connection attempt $attempt/$max_attempts"
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "Error: Could not connect to PostgreSQL after multiple attempts"
  exit 1
fi

# Create the database if it doesn't exist
echo "Ensuring database ${POSTGRES_DB} exists..."
PGPASSWORD="$POSTGRES_PASSWORD" psql -h ${POSTGRES_HOST} -U "$POSTGRES_USER" -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '${POSTGRES_DB}'" | grep -q 1 || \
  PGPASSWORD="$POSTGRES_PASSWORD" psql -h ${POSTGRES_HOST} -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE ${POSTGRES_DB}"

# Now connect to the application database to verify it
attempt=0
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h ${POSTGRES_HOST} -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' > /dev/null 2>&1 || [ $attempt -eq $max_attempts ]; do
  attempt=$((attempt+1))
  echo "Application database connection attempt $attempt/$max_attempts"
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "Error: Could not connect to application database after multiple attempts"
  exit 1
fi

echo "Running database migrations..."
cd /app
# Create migrations directory if it doesn't exist
mkdir -p /app/internal/db/migrations

# Run the migrations
set +e
# Use migrate command directly
migrate -path /app/internal/db/migrations -database "$PG_URL" -verbose up
set -e
echo "Database migrations complete."

# Create config directory if it doesn't exist
mkdir -p /app/config

# Execute the Go application
# Ensure the environment is set up for Go scripts if Go is available
if command -v go >/dev/null 2>&1; then
  echo "Setting up Go environment..."
  export GO111MODULE=on
  export GOPATH="/go"
  export PATH=$PATH:$GOPATH/bin
  
  # Set up symbolic links for module resolution
  echo "Setting up module path structure..."
  mkdir -p $GOPATH/src/github.com/careecodes
  ln -sf /app $GOPATH/src/github.com/careecodes/RentDaddy
  
  # Ensure the vendor directory permissions are correct
  echo "Ensuring vendor directory permissions..."
  chmod -R 755 /app/vendor 2>/dev/null || true
  
  # Set up symlinks to internal packages to ensure they're available for scripts
  echo "Setting up internal packages in vendor directory..."
  mkdir -p /app/vendor/github.com/careecodes/RentDaddy/internal/
  
  # Create symlinks to internal directories
  echo "Creating symlinks for internal packages..."
  ln -sfn /app/internal /app/vendor/github.com/careecodes/RentDaddy/
  
  # Install necessary packages for scripts
  echo "Installing dependencies for scripts..."
  go mod download github.com/bxcodec/faker/v4
  go mod download github.com/clerk/clerk-sdk-go/v2
else
  echo "Go not found, skipping module dependencies - continuing with server startup..."
fi

echo "Starting Go server..."
exec /app/server
