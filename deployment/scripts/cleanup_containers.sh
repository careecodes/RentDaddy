#!/bin/bash
#
# Script to stop all running containers and clean up all stopped containers on an EC2 instance
# 

set -e

echo "===== Container Cleanup Script ====="
echo "This script will:"
echo "1. Stop all running containers"
echo "2. Remove all stopped containers"
echo "3. Clean up unused images, networks, and volumes"
echo "======================================"

# Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "Error: Docker daemon is not running"
    exit 1
fi

# Stop all running containers
echo "Stopping all running containers..."
running_containers=$(docker ps -q)
if [ -n "$running_containers" ]; then
    docker stop $running_containers
    echo "All containers stopped successfully."
else
    echo "No running containers found."
fi

# Remove all stopped containers
echo "Removing all stopped containers..."
docker container prune -f
echo "Stopped containers removed."

# Clean up unused images, networks, and volumes (optional)
echo "Cleaning up unused Docker resources..."
docker system prune -f
echo "Cleanup completed successfully!"

echo "======================================"
echo "Current Docker status:"
echo "Running Containers:"
docker ps
echo "======================================"
echo "Disk usage:"
docker system df
echo "======================================"