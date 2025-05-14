#!/bin/bash
set -e

# Unified script to build standalone seed users binary
# Supports both regular and Clerk-enabled seeding

# Log function for better output
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to find project root (works from any subdirectory)
find_project_root() {
  # Try to use git to find the repository root
  if git rev-parse --show-toplevel &> /dev/null; then
    git rev-parse --show-toplevel
  else
    # Fallback if not in a git repository
    echo "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  fi
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

# Find the project root
PROJECT_ROOT=$(find_project_root)
log "Project root directory: $PROJECT_ROOT"

# Set binary name and paths based on mode
if [ "$WITH_CLERK" = true ]; then
  BINARY_NAME="seed_users_with_clerk"
  SOURCE_FILES="scripts/cmd/seed_users_with_clerk/main.go scripts/cmd/seed_users_with_clerk/seed_users.go"
  log "Building standalone seed_users_with_clerk binary..."
else
  BINARY_NAME="seedusers"
  SOURCE_FILES="scripts/cmd/seedusers/main.go scripts/cmd/seedusers/seed_users.go"
  log "Building standalone seedusers binary..."
fi

# Change to backend directory
cd "$PROJECT_ROOT/backend"

# Make sure the vendor directory exists
if [ ! -d "vendor" ]; then
  log "Creating vendor directory..."
  go mod vendor
fi

# Create bin directory if it doesn't exist
mkdir -p bin

# Build the binary
log "Compiling $BINARY_NAME..."
go build -mod=vendor -o "bin/$BINARY_NAME" $SOURCE_FILES

if [ -f "bin/$BINARY_NAME" ]; then
  log "✅ Successfully built $BINARY_NAME binary at: $(pwd)/bin/$BINARY_NAME"
  log ""
  log "To run this binary in the production container:"
  log "1. Copy the binary to the container:"
  log "   aws s3 cp bin/$BINARY_NAME s3://your-bucket/$BINARY_NAME"
  log ""
  log "2. Inside the container:"
  log "   aws s3 cp s3://your-bucket/$BINARY_NAME /app/bin/$BINARY_NAME"
  log "   chmod +x /app/bin/$BINARY_NAME"
  log "   CLERK_SECRET_KEY=your_key SCRIPT_MODE=true /app/bin/$BINARY_NAME"
else
  log "❌ Failed to build $BINARY_NAME binary"
  exit 1
fi