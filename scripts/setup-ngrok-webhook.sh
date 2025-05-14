#!/bin/bash
# Script to set up ngrok and configure Clerk webhook URL
# This script:
# 1. Ensures ngrok is running with correct auth
# 2. Extracts the public URL
# 3. Displays instructions for configuring Clerk

set -e

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
  echo "Please run this script from the root directory of the project"
  exit 1
fi

# Ensure environment file exists
if [ ! -f "frontend/app/.env.development.local" ]; then
  echo "Error: frontend/app/.env.development.local not found"
  exit 1
fi

# Extract ngrok auth token
NGROK_AUTHTOKEN=$(grep NGROK_AUTHTOKEN frontend/app/.env.development.local | cut -d '=' -f2)
if [ -z "$NGROK_AUTHTOKEN" ]; then
  echo "Error: NGROK_AUTHTOKEN not found in frontend/app/.env.development.local"
  echo "Please add it with the format: NGROK_AUTHTOKEN=your_token_here"
  exit 1
fi

echo "Found ngrok auth token: ${NGROK_AUTHTOKEN:0:5}...${NGROK_AUTHTOKEN: -5}"

# Update docker-compose.yml for ngrok
cat > docker-compose.override.yml << EOF
services:
  ngrok:
    image: ngrok/ngrok:latest
    container_name: ngrok
    restart: unless-stopped
    ports:
      - "4040:4040"
    environment:
      - NGROK_AUTHTOKEN=$NGROK_AUTHTOKEN
    entrypoint: ["ngrok", "http", "host.docker.internal:8080"]
    volumes:
      - ngrok-data:/root/.ngrok2
    networks:
      - app-network
    depends_on:
      - backend

volumes:
  ngrok-data:
EOF

echo "Created docker-compose.override.yml with ngrok configuration"

# Restart ngrok container
echo "Restarting ngrok container..."
docker-compose stop ngrok || true
docker-compose rm -f ngrok || true
docker-compose up -d ngrok

# Wait for ngrok to start
echo "Waiting for ngrok to initialize..."
sleep 5

# Get the public URL from ngrok API
echo "Fetching ngrok public URL..."
MAX_RETRIES=10
RETRY_COUNT=0
NGROK_URL=""

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o 'https://[^"]*\.ngrok-free\.app' || echo "")
  
  if [ -n "$NGROK_URL" ]; then
    break
  fi
  
  echo "Waiting for ngrok tunnel to be created... (retry $((RETRY_COUNT+1))/$MAX_RETRIES)"
  RETRY_COUNT=$((RETRY_COUNT+1))
  sleep 3
done

if [ -z "$NGROK_URL" ]; then
  echo "Failed to get ngrok URL. Please check http://localhost:4040 manually."
  echo "If you don't see the dashboard, try running: docker logs ngrok"
  exit 1
fi

# Display the webhook setup instructions
echo "======================================================================================="
echo "🎉 SUCCESS! Ngrok is running with public URL: $NGROK_URL"
echo "======================================================================================="
echo
echo "To set up webhooks in Clerk:"
echo "1. Go to https://dashboard.clerk.com"
echo "2. Select your application"
echo "3. Navigate to 'Webhooks' in the sidebar"
echo "4. Click 'Add Endpoint'"
echo "5. Enter the following URL: ${NGROK_URL}/webhooks/clerk"
echo "6. Select the events you want to listen for (typically 'user.created' and 'user.updated')"
echo "7. Copy the signing secret and add it to your backend/.env.development.local file as CLERK_WEBHOOK"
echo
echo "Your webhook endpoint is now available at: ${NGROK_URL}/webhooks/clerk"
echo
echo "You can view the ngrok dashboard at: http://localhost:4040"
echo "======================================================================================="