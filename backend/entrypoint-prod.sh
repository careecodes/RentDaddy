#!/bin/sh
set -e

echo "[ENTRYPOINT-PROD] Backend starting..."

# In production, environment variables should be provided by the environment
# (e.g., container platform, Kubernetes, etc.)

# Only log non-sensitive configuration values
echo "[ENTRYPOINT-PROD] PORT: $PORT"
echo "[ENTRYPOINT-PROD] Database connection being established... (credentials masked for security)"

# Set up database connection string
export PG_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DB}?sslmode=disable"

# Set password as environment variable once to avoid multiple command-line appearances
export PGPASSWORD="$POSTGRES_PASSWORD"

# The postgres service in docker-compose already has a healthcheck,
# but we'll add a quick check to make sure our connection works
echo "Verifying PostgreSQL connection..."
attempt=0
max_attempts=30

# First try connecting to postgres default database to ensure the server is up
until psql -h ${POSTGRES_HOST} -U "$POSTGRES_USER" -d "postgres" -c '\q' > /dev/null 2>&1 || [ $attempt -eq $max_attempts ]; do
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
psql -h ${POSTGRES_HOST} -U "$POSTGRES_USER" -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '${POSTGRES_DB}'" | grep -q 1 || \
  psql -h ${POSTGRES_HOST} -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE ${POSTGRES_DB}"

# Now connect to the application database to verify it
attempt=0
until psql -h ${POSTGRES_HOST} -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' > /dev/null 2>&1 || [ $attempt -eq $max_attempts ]; do
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

# Verify task is available
if ! command -v task >/dev/null 2>&1; then
    echo "ERROR: Task CLI not found. It should be installed in the container."
    exit 1
fi

# Verify Taskfile.yaml exists
if [ ! -f "/app/Taskfile.yaml" ]; then
    echo "ERROR: Taskfile.yaml not found in /app. Check the Docker build."
    ls -la /app
    exit 1
fi

# Simple approach: run migrations using Task CLI, which is installed and defined in Taskfile.yaml
echo "Running migrations with Task CLI..."
# Export variables explicitly for Task CLI
export POSTGRES_HOST="${POSTGRES_HOST}"
export POSTGRES_PORT="5432"
export POSTGRES_USER="${POSTGRES_USER}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD}"
export POSTGRES_DB="${POSTGRES_DB}"
# Export the full PG_URL to override any hardcoded values in Taskfile
export PG_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DB}?sslmode=disable"

# Log database connection with masked password
echo "Using database URL: postgresql://${POSTGRES_USER}:****@${POSTGRES_HOST}:5432/${POSTGRES_DB}?sslmode=disable"
set +e
# Run migrations with explicit variables
task migrate:up
MIGRATION_STATUS=$?
set -e

# Check if migrations succeeded
if [ $MIGRATION_STATUS -ne 0 ]; then
    echo "❌ ERROR: Migrations failed"
    exit 1
else
    echo "✅ Database migrations completed successfully."
fi

set -e

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
  mkdir -p /app/vendor/github.com/careecodes/RentDaddy/
  
  # Remove existing directory or symlink if it exists
  echo "Checking for existing internal directory or symlink..."
  if [ -e "/app/vendor/github.com/careecodes/RentDaddy/internal" ]; then
    echo "Found existing internal directory or symlink, removing it..."
    rm -rf /app/vendor/github.com/careecodes/RentDaddy/internal
  fi
  
  # Create symlinks to internal directories
  echo "Creating symlinks for internal packages..."
  ln -sfn /app/internal /app/vendor/github.com/careecodes/RentDaddy/
  
  # Add symlink for pkg directory if it doesn't exist
  if [ ! -e "/app/vendor/github.com/careecodes/RentDaddy/pkg" ]; then
    echo "Setting up pkg package symlink..."
    ln -sfn /app/pkg /app/vendor/github.com/careecodes/RentDaddy/
  fi
  
  # Create symlink for utils package to ensure it's available for scripts
  if [ ! -e "/app/vendor/github.com/careecodes/RentDaddy/internal/utils" ]; then
    echo "Ensuring internal/utils directory exists..."
    mkdir -p /app/internal/utils
  fi
  
  # Verify the symlinks were created correctly
  echo "Verifying symlink creation..."
  if [ -L "/app/vendor/github.com/careecodes/RentDaddy/internal" ] && [ -d "/app/internal/utils" ]; then
    echo "✅ Symlinks created successfully"
    ls -la /app/vendor/github.com/careecodes/RentDaddy/
    ls -la /app/vendor/github.com/careecodes/RentDaddy/internal/
    
    # Check if utils directory is accessible through symlink
    if [ -d "/app/vendor/github.com/careecodes/RentDaddy/internal/utils" ]; then
      echo "✅ internal/utils directory is accessible through symlink"
    else
      echo "❌ internal/utils directory is not accessible through symlink"
      exit 1
    fi
  else
    echo "❌ Failed to create symlinks"
    ls -la /app/vendor/github.com/careecodes/RentDaddy/
    exit 1
  fi
  
  # Ensure vendor directory permissions only
  echo "Ensuring vendor directory permissions..."
  if [ -d "/app/vendor" ]; then
    chmod -R 755 /app/vendor 2>/dev/null || true
  else
    echo "WARNING: Vendor directory not found. This may cause issues with scripts."
  fi
  
  # Install necessary packages for scripts
  echo "Installing dependencies for scripts..."
  go mod download github.com/bxcodec/faker/v4
  go mod download github.com/clerk/clerk-sdk-go/v2
else
  echo "Go not found, skipping module dependencies - continuing with server startup..."
fi

# Start the server directly
echo "[ENTRYPOINT-PROD] Starting Go server..."
exec /app/server
