#!/bin/bash
set -e

# Unified script to run seed users in a running container
# Supports both regular and Clerk-enabled seeding

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

# We now use a unified script with a flag
SCRIPT_NAME="run-seed-users.sh"
SCRIPT_ARGS=""
if [ "$WITH_CLERK" = true ]; then
  SCRIPT_ARGS="--with-clerk"
  log "Running seed_users_with_clerk in container..."
else
  log "Running seedusers in container..."
fi

# Get the running container ID for the backend service
CONTAINER_ID=$(aws ecs list-tasks --cluster rentdaddy-cluster --service-name rentdaddy-app-service --query 'taskArns[0]' --output text | xargs -I{} aws ecs describe-tasks --cluster rentdaddy-cluster --tasks {} --query 'tasks[0].containers[0].runtimeId' --output text)

if [ -z "$CONTAINER_ID" ]; then
  log "Error: Could not find running container for backend service"
  exit 1
fi

log "Found backend container: $CONTAINER_ID"

# Get the EC2 instance ID running this container
INSTANCE_ID=$(aws ecs describe-tasks --cluster rentdaddy-cluster --tasks $(aws ecs list-tasks --cluster rentdaddy-cluster --service-name rentdaddy-app-service --query 'taskArns[0]' --output text) --query 'tasks[0].containerInstanceArn' --output text | xargs -I{} aws ecs describe-container-instances --cluster rentdaddy-cluster --container-instances {} --query 'containerInstances[0].ec2InstanceId' --output text)

if [ -z "$INSTANCE_ID" ]; then
  log "Error: Could not find EC2 instance running the container"
  exit 1
fi

log "Running on EC2 instance: $INSTANCE_ID"

# Connect to the EC2 instance using SSM
log "Connecting to EC2 instance and executing $SCRIPT_NAME in container..."
aws ssm start-session --target $INSTANCE_ID --document-name AWS-StartInteractiveCommand --parameters "command=docker exec $CONTAINER_ID bash /app/scripts/$SCRIPT_NAME $SCRIPT_ARGS"

log "Seed users script execution complete"