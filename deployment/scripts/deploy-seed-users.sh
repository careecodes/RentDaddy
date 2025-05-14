#!/bin/bash
set -e

# Unified script for deploying and running seed users in the production environment
# Supports both regular and Clerk-enabled seeding
# Prerequisites: AWS CLI configured, S3 bucket available, ECS task running

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

# Configuration
S3_BUCKET="rentdaddydocumenso"  # Using the existing S3 bucket from the documenso config
S3_REGION="us-east-1"           # The region for the S3 bucket per documenso config
CLUSTER="rentdaddy-cluster"
SERVICE="rentdaddy-app-service"
AWS_REGION="us-east-2"          # The region for the ECS cluster

# Find the project root
PROJECT_ROOT=$(find_project_root)
log "Project root directory: $PROJECT_ROOT"

# Set binary name and paths based on mode
if [ "$WITH_CLERK" = true ]; then
  BINARY_NAME="seed_users_with_clerk"
  SOURCE_FILES="scripts/cmd/seed_users_with_clerk/main.go scripts/cmd/seed_users_with_clerk/seed_users.go"
  log "=== Deploying seed_users_with_clerk binary to production ==="
else
  BINARY_NAME="seedusers"
  SOURCE_FILES="scripts/cmd/seedusers/main.go scripts/cmd/seedusers/seed_users.go"
  log "=== Deploying seedusers binary to production ==="
fi

BINARY_PATH="$PROJECT_ROOT/backend/bin/$BINARY_NAME"

# Step 1: Build the binary if it doesn't exist
log "Checking for $BINARY_NAME binary..."

if [ ! -f "$BINARY_PATH" ]; then
  log "Building $BINARY_NAME binary..."
  mkdir -p "$PROJECT_ROOT/backend/bin"
  cd "$PROJECT_ROOT/backend"
  go mod vendor
  go build -mod=vendor -o "bin/$BINARY_NAME" $SOURCE_FILES
fi

if [ ! -f "$BINARY_PATH" ]; then
  log "Error: Failed to build $BINARY_NAME binary"
  exit 1
fi

# Step A: Upload binary to S3
log "Uploading $BINARY_NAME binary to S3 bucket: $S3_BUCKET"
aws s3 cp "$BINARY_PATH" "s3://$S3_BUCKET/$BINARY_NAME" --region "$S3_REGION"
log "Binary uploaded to s3://$S3_BUCKET/$BINARY_NAME"

# Step B: Get the task ARN of the running container
log "Finding running task in ECS cluster: $CLUSTER, service: $SERVICE"
TASK_ARN=$(aws ecs list-tasks --cluster "$CLUSTER" --service-name "$SERVICE" --region "$AWS_REGION" --query 'taskArns[0]' --output text)

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" == "None" ]; then
  log "Error: No running tasks found for service $SERVICE"
  exit 1
fi

log "Found task: $TASK_ARN"

# Step C: Execute the binary in the container
log "Executing $BINARY_NAME in the container..."
aws ecs execute-command --cluster "$CLUSTER" --task "$TASK_ARN" --container "backend" --region "$AWS_REGION" --command "/bin/bash" --interactive <<EOF
# Create bin directory
mkdir -p /app/bin

# Set AWS region for S3 download
export AWS_REGION=$S3_REGION 

# Download binary from S3
echo "Downloading $BINARY_NAME binary from S3..."
aws s3 cp s3://$S3_BUCKET/$BINARY_NAME /app/bin/$BINARY_NAME

# Make binary executable
chmod +x /app/bin/$BINARY_NAME

# Set up Go environment for the binary
export GO111MODULE=on
export GOPATH="/go"
export PATH=\$PATH:\$GOPATH/bin

# Set up symbolic links for module resolution
mkdir -p \$GOPATH/src/github.com/careecodes
ln -sf /app \$GOPATH/src/github.com/careecodes/RentDaddy

# Run the binary
echo "Running $BINARY_NAME..."
cd /app
SCRIPT_MODE=true /app/bin/$BINARY_NAME

# Clean up
echo "Cleaning up..."
rm /app/bin/$BINARY_NAME
EOF

log "=== $BINARY_NAME deployment and execution complete ==="