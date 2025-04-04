#!/bin/bash
set -e

# This script builds a standalone seedusers binary to avoid Go module path issues

echo "Building standalone seedusers binary..."
cd /Users/reemmokhtar/Library/CloudStorage/OneDrive-Personal/Documents/DevOps/CYC_Prototype_Apartment/RentDaddy_Production/RentDaddy/backend

# Make sure the vendor directory exists
if [ ! -d "vendor" ]; then
  echo "Creating vendor directory..."
  go mod vendor
fi

# Build the seedusers binary
echo "Compiling seedusers..."
go build -mod=vendor -o bin/seedusers scripts/cmd/seedusers/main.go scripts/cmd/seedusers/seed_users.go

if [ -f "bin/seedusers" ]; then
  echo "✅ Successfully built seedusers binary at: $(pwd)/bin/seedusers"
  echo ""
  echo "To run this binary in the production container:"
  echo "1. Copy the binary to the container:"
  echo "   aws s3 cp bin/seedusers s3://your-bucket/seedusers"
  echo ""
  echo "2. Inside the container:"
  echo "   aws s3 cp s3://your-bucket/seedusers /app/bin/seedusers"
  echo "   chmod +x /app/bin/seedusers"
  echo "   CLERK_SECRET_KEY=your_key SCRIPT_MODE=true /app/bin/seedusers"
else
  echo "❌ Failed to build seedusers binary"
  exit 1
fi