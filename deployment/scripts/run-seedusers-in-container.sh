#!/bin/bash
set -e

# This script executes the seedusers program inside the running container

# Get the running container ID for the backend service
CONTAINER_ID=$(aws ecs list-tasks --cluster rentdaddy-cluster --service-name rentdaddy-app-service --query 'taskArns[0]' --output text | xargs -I{} aws ecs describe-tasks --cluster rentdaddy-cluster --tasks {} --query 'tasks[0].containers[0].runtimeId' --output text)

if [ -z "$CONTAINER_ID" ]; then
  echo "Error: Could not find running container for backend service"
  exit 1
fi

echo "Found backend container: $CONTAINER_ID"

# Get the EC2 instance ID running this container
INSTANCE_ID=$(aws ecs describe-tasks --cluster rentdaddy-cluster --tasks $(aws ecs list-tasks --cluster rentdaddy-cluster --service-name rentdaddy-app-service --query 'taskArns[0]' --output text) --query 'tasks[0].containerInstanceArn' --output text | xargs -I{} aws ecs describe-container-instances --cluster rentdaddy-cluster --container-instances {} --query 'containerInstances[0].ec2InstanceId' --output text)

if [ -z "$INSTANCE_ID" ]; then
  echo "Error: Could not find EC2 instance running the container"
  exit 1
fi

echo "Running on EC2 instance: $INSTANCE_ID"

# Connect to the EC2 instance using SSM
echo "Connecting to EC2 instance and executing seedusers script in container..."
aws ssm start-session --target $INSTANCE_ID --document-name AWS-StartInteractiveCommand --parameters "command=docker exec $CONTAINER_ID bash /app/scripts/run-seedusers.sh"

echo "Seedusers script execution complete"