#!/bin/bash

# Load utility functions
source "$(dirname "$0")/utils.sh"

# Initialize
PROJECT_ROOT=$(find_project_root)
init_script "Test Project Root" docker aws

# Test file existence
ENV_FILE="$PROJECT_ROOT/backend/.env.production.local"

echo "Testing file existence..."
echo "PROJECT_ROOT: $PROJECT_ROOT"
echo "ENV_FILE: $ENV_FILE"

if [ -f "$ENV_FILE" ]; then
  echo "File exists: $ENV_FILE"
  # Try to read the file
  cat "$ENV_FILE" | head -n 3
else
  echo "File does not exist: $ENV_FILE"
fi

# Test the find_project_root function directly
DIRECT_ROOT=$(find_project_root)
echo "Direct root: $DIRECT_ROOT"

# Check if the file exists using the direct root
DIRECT_ENV_FILE="$DIRECT_ROOT/backend/.env.production.local"
if [ -f "$DIRECT_ENV_FILE" ]; then
  echo "File exists with direct root: $DIRECT_ENV_FILE"
else
  echo "File does not exist with direct root: $DIRECT_ENV_FILE"
fi