#!/bin/bash
set -e

# This script deploys and runs the seedusers binary in the production environment
# Prerequisites: AWS CLI configured, S3 bucket available, ECS task running

# Configuration
S3_BUCKET="rentdaddydocumenso"  # Using the existing S3 bucket from the documenso config
S3_REGION="us-east-1"           # The region for the S3 bucket per documenso config
CLUSTER="rentdaddy-cluster"
SERVICE="rentdaddy-app-service"
AWS_REGION="us-east-2"          # The region for the ECS cluster

echo "=== Deploying seedusers binary to production ==="

# Step 1: Build the seedusers binary if it doesn't exist
echo "Checking for seedusers binary..."
BINARY_PATH="/Users/reemmokhtar/Library/CloudStorage/OneDrive-Personal/Documents/DevOps/CYC_Prototype_Apartment/RentDaddy_Production/RentDaddy/backend/bin/seedusers"

if [ ! -f "$BINARY_PATH" ]; then
  echo "Building seedusers binary..."
  mkdir -p "/Users/reemmokhtar/Library/CloudStorage/OneDrive-Personal/Documents/DevOps/CYC_Prototype_Apartment/RentDaddy_Production/RentDaddy/backend/bin"
  cd "/Users/reemmokhtar/Library/CloudStorage/OneDrive-Personal/Documents/DevOps/CYC_Prototype_Apartment/RentDaddy_Production/RentDaddy/backend"
  go mod vendor
  go build -mod=vendor -o bin/seedusers scripts/cmd/seedusers/main.go scripts/cmd/seedusers/seed_users.go
fi

if [ ! -f "$BINARY_PATH" ]; then
  echo "Error: Failed to build seedusers binary"
  exit 1
fi

# Step A: Upload binary to S3
echo "Uploading seedusers binary to S3 bucket: $S3_BUCKET"
aws s3 cp "$BINARY_PATH" "s3://$S3_BUCKET/seedusers" --region "$S3_REGION"
echo "Binary uploaded to s3://$S3_BUCKET/seedusers"

# Step B: Get the task ARN of the running container
echo "Finding running task in ECS cluster: $CLUSTER, service: $SERVICE"
TASK_ARN=$(aws ecs list-tasks --cluster "$CLUSTER" --service-name "$SERVICE" --region "$AWS_REGION" --query 'taskArns[0]' --output text)

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" == "None" ]; then
  echo "Error: No running tasks found for service $SERVICE"
  exit 1
fi

echo "Found task: $TASK_ARN"

# Step C: Execute the seedusers binary in the container
echo "Executing seedusers in the container..."
aws ecs execute-command --cluster "$CLUSTER" --task "$TASK_ARN" --container "backend" --region "$AWS_REGION" --command "/bin/bash" --interactive <<EOF
# Create bin directory
mkdir -p /app/bin

# Set AWS region for S3 download
export AWS_REGION=$S3_REGION 

# Download seedusers binary from S3
echo "Downloading seedusers binary from S3..."
aws s3 cp s3://$S3_BUCKET/seedusers /app/bin/seedusers

# Make binary executable
chmod +x /app/bin/seedusers

# Set up Go environment for the binary
export GO111MODULE=on
export GOPATH="/go"
export PATH=\$PATH:\$GOPATH/bin

# Set up symbolic links for module resolution
mkdir -p \$GOPATH/src/github.com/careecodes
ln -sf /app \$GOPATH/src/github.com/careecodes/RentDaddy

# Run the seedusers binary
echo "Running seedusers..."
cd /app
SCRIPT_MODE=true /app/bin/seedusers

# Clean up
echo "Cleaning up..."
rm /app/bin/seedusers
EOF

echo "=== Seedusers deployment and execution complete ==="