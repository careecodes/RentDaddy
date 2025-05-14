#!/bin/bash
# s3_deploy_documenso_cert.sh - Deploy Documenso certificate using S3 as intermediary

# Set the region
REGION="us-east-2"

# S3 bucket to use - you mentioned this bucket is already set up with proper permissions
S3_BUCKET="rentdaddy-artifacts"  

# Define the instance IDs we know about
INSTANCE_IDS=("i-0906efbaeb8c258bf" "i-0bb2eb2f52fb6a812")

# First, upload the certificate to S3
echo "Uploading certificate to S3..."
aws s3 cp /Users/reemmokhtar/Library/CloudStorage/OneDrive-Personal/Documents/DevOps/CYC_Prototype_Apartment/RentDaddy_Production/RentDaddy/docker/documenso/cert.p12 s3://$S3_BUCKET/certs/cert.p12 --region $REGION

# Make sure the upload was successful
if [ $? -ne 0 ]; then
  echo "Failed to upload certificate to S3. Exiting."
  exit 1
fi

echo "Certificate uploaded to S3 successfully."

# Create a user-data script to download the certificate and set it up
cat > /tmp/documenso-setup.sh << 'EOF'
#!/bin/bash
sudo mkdir -p /opt/documenso
sudo aws s3 cp s3://rentdaddy-artifacts/certs/cert.p12 /opt/documenso/cert.p12 --region us-east-2
sudo chmod 644 /opt/documenso/cert.p12
echo "Certificate setup complete. File details:"
sudo ls -la /opt/documenso/cert.p12
sudo systemctl restart docker
sudo systemctl restart ecs
echo "Docker and ECS services restarted"
EOF

# Create a JSON file for the AWS Systems Manager SendCommand
cat > /tmp/ssm-command.json << EOF
{
  "DocumentName": "AWS-RunShellScript",
  "Parameters": {
    "commands": [
      "mkdir -p /opt/documenso",
      "aws s3 cp s3://$S3_BUCKET/certs/cert.p12 /opt/documenso/cert.p12 --region $REGION",
      "chmod 644 /opt/documenso/cert.p12",
      "ls -la /opt/documenso/cert.p12",
      "systemctl restart docker",
      "systemctl restart ecs",
      "echo 'Certificate deployed and services restarted'"
    ]
  },
  "TimeoutSeconds": 180
}
EOF

# Try to send the command to each instance using AWS SSM
for INSTANCE_ID in "${INSTANCE_IDS[@]}"; do
  echo "Deploying certificate to instance $INSTANCE_ID using SSM..."
  
  # Send the command using SSM
  COMMAND_ID=$(aws ssm send-command \
    --instance-ids "$INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"mkdir -p /opt/documenso\",\"aws s3 cp s3://$S3_BUCKET/certs/cert.p12 /opt/documenso/cert.p12 --region $REGION\",\"chmod 644 /opt/documenso/cert.p12\",\"ls -la /opt/documenso/cert.p12\",\"systemctl restart docker\",\"systemctl restart ecs\"]" \
    --timeout-seconds 180 \
    --region $REGION \
    --query "Command.CommandId" \
    --output text 2>/dev/null)
  
  # Check if the command was sent successfully
  if [ $? -eq 0 ] && [ -n "$COMMAND_ID" ]; then
    echo "SSM command sent successfully to $INSTANCE_ID. Command ID: $COMMAND_ID"
    echo "Waiting for command to complete..."
    
    # Wait for the command to complete
    aws ssm wait command-executed \
      --command-id "$COMMAND_ID" \
      --instance-id "$INSTANCE_ID" \
      --region $REGION
    
    # Get the command output
    echo "Command execution complete. Output:"
    aws ssm get-command-invocation \
      --command-id "$COMMAND_ID" \
      --instance-id "$INSTANCE_ID" \
      --region $REGION \
      --query "StandardOutputContent" \
      --output text
  else
    echo "Failed to send SSM command to $INSTANCE_ID."
    echo "Alternative: Use the AWS Management Console to run the following commands on the instance:"
    cat /tmp/documenso-setup.sh
  fi
done

echo "Certificate deployment attempted on all instances."

# Force a new deployment of the Documenso service
echo "Forcing a new deployment of the Documenso service..."
aws ecs update-service \
  --cluster rentdaddy-cluster \
  --service rentdaddy-documenso-service \
  --force-new-deployment \
  --region $REGION

echo "Documenso service redeployment initiated."
echo ""
echo "To check status, run: aws ecs describe-services --cluster rentdaddy-cluster --services rentdaddy-documenso-service --region $REGION"

# Clean up temporary files
rm -f /tmp/documenso-setup.sh /tmp/ssm-command.json