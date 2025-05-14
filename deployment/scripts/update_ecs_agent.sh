#!/bin/bash
#
# Update ECS agent configuration to enable Task IAM Roles
# This script fixes the "ASM secret resource: unable to find execution role credentials" error
#

# Load common utilities
source "$(dirname "$0")/utils.sh"

# Initialize script
init_script "ECS Agent Configuration Update" aws

# Load AWS configurations
AWS_REGION=$(get_terraform_var "aws_region" || echo "us-east-2")
export AWS_REGION

# Get the instance IDs in zone B (where Documenso should run)
log "Finding running ECS instances in availability zone us-east-2b..."
INSTANCE_IDS=$(aws ec2 describe-instances --filters "Name=tag:AmazonECSManaged,Values=" "Name=availability-zone,Values=us-east-2b" "Name=instance-state-name,Values=running" --region $AWS_REGION --query "Reservations[].Instances[].InstanceId" --output text)

if [ -z "$INSTANCE_IDS" ]; then
  log "Error: No instances found in availability zone us-east-2b"
  exit 1
fi

log "Found instances: $INSTANCE_IDS"

# Process each instance
for INSTANCE_ID in $INSTANCE_IDS; do
  log "Updating ECS configuration on instance $INSTANCE_ID..."
  
  # Stop the ECS agent
  aws ssm send-command \
    --document-name "AWS-RunShellScript" \
    --targets "Key=instanceids,Values=$INSTANCE_ID" \
    --parameters "commands=[
      'echo \"Stopping ECS agent...\"',
      'sudo systemctl stop ecs',
      'sudo docker stop ecs-agent || true',
      'sudo docker rm ecs-agent || true',
      'echo \"Updating /etc/ecs/ecs.config...\"',
      'echo \"ECS_CLUSTER=rentdaddy-cluster\" | sudo tee /etc/ecs/ecs.config',
      'echo \"ECS_ENABLE_TASK_IAM_ROLE=true\" | sudo tee -a /etc/ecs/ecs.config',
      'echo \"ECS_ENABLE_TASK_IAM_ROLE_NETWORK_HOST=true\" | sudo tee -a /etc/ecs/ecs.config',
      'echo \"Starting ECS agent with IAM role support...\"',
      'sudo docker run --name ecs-agent \\
        --detach=true \\
        --restart=on-failure:10 \\
        --volume=/var/run:/var/run \\
        --volume=/var/log/ecs/:/log \\
        --volume=/var/lib/ecs/data:/data \\
        --volume=/etc/ecs:/etc/ecs \\
        --volume=/var/lib/docker/volumes:/var/lib/docker/volumes \\
        --net=host \\
        --env-file=/etc/ecs/ecs.config \\
        --env ECS_ENABLE_TASK_IAM_ROLE=true \\
        --env ECS_ENABLE_TASK_IAM_ROLE_NETWORK_HOST=true \\
        --env ECS_DATADIR=/data \\
        --env ECS_LOGFILE=/log/ecs-agent.log \\
        --env ECS_AVAILABLE_LOGGING_DRIVERS=\"[\\\"json-file\\\",\\\"awslogs\\\"]\" \\
        --env ECS_LOGLEVEL=info \\
        amazon/amazon-ecs-agent:latest',
      'echo \"Verifying ECS agent container...\"',
      'sudo docker ps | grep ecs-agent',
      'echo \"Waiting for ECS agent to start...\"',
      'sleep 10',
      'echo \"Verifying ECS agent configuration...\"',
      'cat /etc/ecs/ecs.config',
      'echo \"Done!\"'
    ]" \
    --region $AWS_REGION
  
  log "Command sent to instance $INSTANCE_ID. Waiting for completion..."
  sleep 5
done

log "ECS configuration update initiated on all instances. Waiting for changes to take effect..."
sleep 30

# Force a new deployment of the Documenso service
log "Forcing new deployment of Documenso service..."
aws ecs update-service --cluster rentdaddy-cluster --service rentdaddy-documenso-service --force-new-deployment --region $AWS_REGION

log "Deployment triggered. Monitor service status with:"
log "aws ecs describe-services --cluster rentdaddy-cluster --services rentdaddy-documenso-service --region $AWS_REGION"

log "Done! Please allow a few minutes for the new tasks to start and stabilize."