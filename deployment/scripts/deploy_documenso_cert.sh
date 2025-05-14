#!/bin/bash
# deploy_documenso_cert.sh - Script to deploy the documenso certificate to EC2 instances

# Set the region
REGION="us-east-2"

# Get instance IDs and IP addresses
INSTANCE_IDS=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=rentdaddy-ecs-instance" --query "Reservations[].Instances[].InstanceId" --output text --region $REGION)

echo "Found instances: $INSTANCE_IDS"

# Loop through instances and copy the certificate
for INSTANCE_ID in $INSTANCE_IDS; do
  IP_ADDRESS=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query "Reservations[].Instances[].PublicIpAddress" --output text --region $REGION)
  
  echo "Deploying certificate to instance $INSTANCE_ID ($IP_ADDRESS)..."
  
  # Copy the certificate to the instance
  scp -i ~/.ssh/rentdaddy_key -o StrictHostKeyChecking=no /Users/reemmokhtar/Library/CloudStorage/OneDrive-Personal/Documents/DevOps/CYC_Prototype_Apartment/RentDaddy_Production/RentDaddy/docker/documenso/cert.p12 ec2-user@$IP_ADDRESS:/tmp/cert.p12
  
  # Move it to the correct location and set permissions
  ssh -i ~/.ssh/rentdaddy_key -o StrictHostKeyChecking=no ec2-user@$IP_ADDRESS "sudo mkdir -p /opt/documenso && sudo cp /tmp/cert.p12 /opt/documenso/cert.p12 && sudo chmod 644 /opt/documenso/cert.p12 && rm /tmp/cert.p12"
  
  echo "Certificate deployed successfully to $INSTANCE_ID"
  
  # Restart ECS agent to pick up changes
  ssh -i ~/.ssh/rentdaddy_key -o StrictHostKeyChecking=no ec2-user@$IP_ADDRESS "sudo systemctl restart ecs"
  
  echo "ECS agent restarted on $INSTANCE_ID"
done

# Force a new deployment of the Documenso service
aws ecs update-service --cluster rentdaddy-cluster --service rentdaddy-documenso-service --force-new-deployment --region $REGION

echo "Documenso service redeployed. Check status with: aws ecs describe-services --cluster rentdaddy-cluster --services rentdaddy-documenso-service --region $REGION"