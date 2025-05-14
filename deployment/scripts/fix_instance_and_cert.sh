#!/bin/bash
# fix_instance_and_cert.sh - Script to fix EC2 instance IAM role and install certificate

# Set the region
REGION="us-east-2"

# EC2 instance details - adjust these values to match your specific instance
INSTANCE_ID="i-0906efbaeb8c258bf"  # or whichever is in us-east-2b

# 1. First, we'll fix the IAM role by attaching the correct instance profile
echo "Fixing instance IAM role..."
aws ec2 associate-iam-instance-profile \
  --instance-id $INSTANCE_ID \
  --iam-instance-profile Name=rentdaddy-ecs-instance-profile \
  --region $REGION

# 2. Now, we copy the certificate locally and then use scp to upload it
echo "Creating local cert file for upload..."
cp /Users/reemmokhtar/Library/CloudStorage/OneDrive-Personal/Documents/DevOps/CYC_Prototype_Apartment/RentDaddy_Production/RentDaddy/docker/documenso/cert.p12 /tmp/cert.p12

# Get the public IP of the instance
INSTANCE_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text \
  --region $REGION)

echo "Instance IP: $INSTANCE_IP"

# SCP the certificate directly to the instance
echo "Uploading certificate to instance..."
scp -o StrictHostKeyChecking=no -i ~/.ssh/rentdaddy_key /tmp/cert.p12 ec2-user@$INSTANCE_IP:/tmp/cert.p12

# SSH to the instance and fix certificate, restart ECS agent
echo "Configuring certificate and restarting ECS agent on instance..."
ssh -o StrictHostKeyChecking=no -i ~/.ssh/rentdaddy_key ec2-user@$INSTANCE_IP << 'EOF'
# Move certificate to proper location
sudo mkdir -p /opt/documenso/
sudo mv /tmp/cert.p12 /opt/documenso/cert.p12
sudo chmod 644 /opt/documenso/cert.p12
ls -la /opt/documenso/cert.p12

# Restart services
sudo systemctl restart docker
sudo systemctl restart ecs

# Wait for container to start
sleep 5
sudo docker ps

# Show ECS configuration
cat /etc/ecs/ecs.config

# Check ECS instance attribute
curl -s http://169.254.169.254/latest/meta-data/iam/security-credentials/
EOF

# Force a new deployment of the Documenso service
echo "Forcing a new deployment of the Documenso service..."
aws ecs update-service \
  --cluster rentdaddy-cluster \
  --service rentdaddy-documenso-service \
  --force-new-deployment \
  --region $REGION

echo "Script completed. Wait a few minutes for the instance to register and the task to start."
echo "Check service status with: aws ecs describe-services --cluster rentdaddy-cluster --services rentdaddy-documenso-service --region $REGION"

# Clean up the local copy of the certificate
rm -f /tmp/cert.p12