#!/bin/bash

CONTAINER_NAME="rentdaddy-backend"

# Check if container is running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  echo "Error: Container $CONTAINER_NAME is not running!"
  exit 1
fi

echo "Running all tests in container: $CONTAINER_NAME..."
docker exec -it "$CONTAINER_NAME" go test -v ./...
