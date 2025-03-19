#!/bin/bash

CONTAINER_NAME="rentdaddy-backend"

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  echo "Error: Container $CONTAINER_NAME is not running!"
  exit 1
fi

# Get changed test files
CHANGED_TEST_FILES=$(git diff --name-only origin/main HEAD | grep '_test\.go$' || true)

if [ -z "$CHANGED_TEST_FILES" ]; then
  echo "No changed test files detected. Running all tests..."
  docker exec -it "$CONTAINER_NAME" go test -v ./...
else
  echo "Running tests for changed files..."
  for file in $CHANGED_TEST_FILES; do
    docker exec -it "$CONTAINER_NAME" go test -v "$file"
  done
fi
