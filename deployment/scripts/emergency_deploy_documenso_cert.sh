#!/bin/bash
# emergency_deploy_documenso_cert.sh - Script to deploy the documenso certificate to specific EC2 instances

# Set the region
REGION="us-east-2"

# Define the instance IPs we know about
INSTANCE_IPS=("3.149.28.128" "18.117.147.88")

# Prompt for password - use with the -p option to scp and ssh
echo "Enter SSH password for EC2 instances:"
read -s PASSWORD

for IP_ADDRESS in "${INSTANCE_IPS[@]}"; do
  echo "Deploying certificate to instance at $IP_ADDRESS..."
  
  # Copy the certificate to the instance using password
  export SSHPASS="$PASSWORD"
  sshpass -e scp -o StrictHostKeyChecking=no /Users/reemmokhtar/Library/CloudStorage/OneDrive-Personal/Documents/DevOps/CYC_Prototype_Apartment/RentDaddy_Production/RentDaddy/docker/documenso/cert.p12 ec2-user@$IP_ADDRESS:/tmp/cert.p12
  
  if [ $? -ne 0 ]; then
    echo "Error: Failed to copy certificate to $IP_ADDRESS"
    continue
  fi
  
  # Move it to the correct location and set permissions
  sshpass -e ssh -o StrictHostKeyChecking=no ec2-user@$IP_ADDRESS "sudo mkdir -p /opt/documenso && sudo cp /tmp/cert.p12 /opt/documenso/cert.p12 && sudo chmod 644 /opt/documenso/cert.p12 && sudo ls -la /opt/documenso/cert.p12 && rm /tmp/cert.p12"
  
  if [ $? -ne 0 ]; then
    echo "Error: Failed to set up certificate on $IP_ADDRESS"
    continue
  fi
  
  echo "Certificate deployed successfully to $IP_ADDRESS"
  
  # Restart ECS agent to pick up changes
  sshpass -e ssh -o StrictHostKeyChecking=no ec2-user@$IP_ADDRESS "sudo systemctl restart docker && sudo systemctl restart ecs"
  
  if [ $? -ne 0 ]; then
    echo "Error: Failed to restart services on $IP_ADDRESS"
    continue
  fi
  
  echo "ECS agent restarted on $IP_ADDRESS"
done

# Force a new deployment of the Documenso service
aws ecs update-service --cluster rentdaddy-cluster --service rentdaddy-documenso-service --force-new-deployment --region $REGION

echo "Documenso service redeployed. Check status with: aws ecs describe-services --cluster rentdaddy-cluster --services rentdaddy-documenso-service --region $REGION"