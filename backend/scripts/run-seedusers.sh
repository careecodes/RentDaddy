#!/bin/bash
set -e

# This script is designed to run inside the container to execute the seedusers program
# It ensures proper module resolution for the seedusers program

echo "Setting up environment for seedusers program..."

# Ensure GOPATH is set
export GOPATH="${GOPATH:-/go}"
export GO111MODULE=on
export PATH=$PATH:$GOPATH/bin

# Make sure we're in the app directory
cd /app

# Create symbolic link for module resolution if it doesn't exist
if [ ! -d "$GOPATH/src/github.com/careecodes/RentDaddy" ]; then
  echo "Setting up module path structure..."
  mkdir -p $GOPATH/src/github.com/careecodes
  ln -sf /app $GOPATH/src/github.com/careecodes/RentDaddy
fi

# Verify the symbolic link
if [ ! -L "$GOPATH/src/github.com/careecodes/RentDaddy" ]; then
  echo "Error: Failed to create symbolic link for module resolution"
  exit 1
fi

echo "Running seedusers program..."
echo "Using CLERK_SECRET_KEY from environment"

# Run go mod vendor to ensure all dependencies are available
echo "Running go mod vendor to ensure dependencies are available..."
go mod vendor

# Run the seedusers program with vendor directory
SCRIPT_MODE=true GO111MODULE=on go run -mod=vendor scripts/cmd/seedusers/main.go scripts/cmd/seedusers/seed_users.go

echo "Seedusers program completed"