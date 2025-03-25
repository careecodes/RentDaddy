# deploy-main.sh

#!/bin/bash
set -e

# Variables
INSTANCE_IP=$1
SSH_KEY=$2

if [[ -z "$INSTANCE_IP" || -z "$SSH_KEY" ]]; then
  echo "Usage: $0 <instance-ip> <ssh-key-path>"
  exit 1
fi

echo "Deploying main application to $INSTANCE_IP..."

# Create deployment package
echo "Creating deployment package..."
TEMP_DIR=$(mktemp -d)
mkdir -p $TEMP_DIR/app

# Copy files to temp directory
cp -r ./backend $TEMP_DIR/app/
cp -r ./frontend $TEMP_DIR/app/
cp docker-compose.yml $TEMP_DIR/app/
cp env.example $TEMP_DIR/app/.env

# Customize .env file if needed
# sed -i 's/PLACEHOLDER/actual-value/g' $TEMP_DIR/app/.env

# Create deployment archive
DEPLOY_ARCHIVE="rentdaddy-deploy.tar.gz"
tar -czf $DEPLOY_ARCHIVE -C $TEMP_DIR app

# Copy archive to server
echo "Copying files to server..."
scp -i $SSH_KEY $DEPLOY_ARCHIVE ec2-user@$INSTANCE_IP:~/

# Extract and deploy on the server
echo "Deploying on server..."
ssh -i $SSH_KEY ec2-user@$INSTANCE_IP << EOF
  mkdir -p ~/app
  tar -xzf ~/rentdaddy-deploy.tar.gz -C ~/
  cd ~/app
  
  # Ensure executable permissions
  chmod +x ./backend/entrypoint.sh
  chmod +x ./backend/scripts/*.sh
  
  # Start the application
  docker-compose up -d
  
  # Clean up
  rm ~/rentdaddy-deploy.tar.gz
EOF

# Clean up local temp files
rm -rf $TEMP_DIR
rm $DEPLOY_ARCHIVE

echo "Main application deployed successfully!"