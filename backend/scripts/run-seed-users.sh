#!/bin/bash
set -e

# Unified script to run seed users programs
# Supports both regular and clerk-enabled seeding
# It ensures proper module resolution for the seed users programs

# Log function for better output
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Parse command line arguments
WITH_CLERK=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-clerk)
      WITH_CLERK=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--with-clerk]"
      exit 1
      ;;
  esac
done

# Set program name based on mode
if [ "$WITH_CLERK" = true ]; then
  PROGRAM_NAME="seed_users_with_clerk"
  SOURCE_FILES="scripts/cmd/seed_users_with_clerk/main.go scripts/cmd/seed_users_with_clerk/seed_users.go"
  log "Setting up environment for seed_users_with_clerk program..."
else
  PROGRAM_NAME="seedusers"
  SOURCE_FILES="scripts/cmd/seedusers/main.go scripts/cmd/seedusers/seed_users.go"
  log "Setting up environment for seedusers program..."
fi

# Ensure GOPATH is set
export GOPATH="${GOPATH:-/go}"
export GO111MODULE=on
export PATH=$PATH:$GOPATH/bin

# Make sure we're in the app directory
cd /app

# Create symbolic link for module resolution if it doesn't exist
if [ ! -d "$GOPATH/src/github.com/careecodes/RentDaddy" ]; then
  log "Setting up module path structure..."
  mkdir -p $GOPATH/src/github.com/careecodes
  ln -sf /app $GOPATH/src/github.com/careecodes/RentDaddy
fi

# Verify the symbolic link
if [ ! -L "$GOPATH/src/github.com/careecodes/RentDaddy" ]; then
  log "Error: Failed to create symbolic link for module resolution"
  exit 1
fi

log "Running $PROGRAM_NAME program..."
log "Using CLERK_SECRET_KEY from environment"

# Run go mod vendor to ensure all dependencies are available
log "Running go mod vendor to ensure dependencies are available..."
go mod vendor

# Fix permissions on vendor directory
log "Fixing permissions on vendor directory..."
chmod -R 755 vendor

# Ensure the internal packages are directly accessible
log "Ensuring internal packages are directly accessible..."
mkdir -p vendor/github.com/careecodes/RentDaddy/internal/
if [ ! -d "vendor/github.com/careecodes/RentDaddy/internal/db" ]; then
  log "Copying internal/db to vendor directory..."
  cp -r internal/db vendor/github.com/careecodes/RentDaddy/internal/
fi

if [ ! -d "vendor/github.com/careecodes/RentDaddy/internal/utils" ]; then
  log "Copying internal/utils to vendor directory..."
  cp -r internal/utils vendor/github.com/careecodes/RentDaddy/internal/
fi

# Run the program with vendor directory and path correctly set
log "Executing $PROGRAM_NAME..."
SCRIPT_MODE=true GO111MODULE=on GOFLAGS="-mod=vendor" go run $SOURCE_FILES

log "$PROGRAM_NAME program completed"