#!/bin/bash

# RentDaddy - Complete Local Development Setup Script
# This script automates the setup process for the RentDaddy project

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Function to print section headers
section() {
  echo ""
  echo -e "${BLUE}========== $1 ==========${NC}"
  echo ""
}

# Function to print success messages
success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to print warning messages
warning() {
  echo -e "${YELLOW}! $1${NC}"
}

# Function to print error messages
error() {
  echo -e "${RED}✗ $1${NC}"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to prompt for user input
prompt() {
  read -p "$1 " REPLY
  echo "$REPLY"
}

# Script title
clear
echo -e "${BLUE}==========================================================${NC}"
echo -e "${BLUE}       RentDaddy Local Development Environment Setup       ${NC}"
echo -e "${BLUE}==========================================================${NC}"
echo ""
echo "This script will help you set up the RentDaddy project for local development."
echo ""

# Check for required tools
section "Checking Prerequisites"

# Check for Docker and Docker Compose
if command_exists docker; then
  success "Docker is installed"
  docker_version=$(docker --version)
  echo "   $docker_version"
else
  error "Docker is not installed. Please install Docker first."
  echo "   Visit https://docs.docker.com/get-docker/ for installation instructions."
  exit 1
fi

if command_exists docker-compose; then
  success "Docker Compose is installed"
  compose_version=$(docker-compose --version)
  echo "   $compose_version"
else
  error "Docker Compose is not installed. Please install Docker Compose first."
  echo "   Visit https://docs.docker.com/compose/install/ for installation instructions."
  exit 1
fi

# Check for OpenSSL (needed for certificate generation)
if command_exists openssl; then
  success "OpenSSL is installed"
  openssl_version=$(openssl version)
  echo "   $openssl_version"
else
  error "OpenSSL is not installed. It's required for certificate generation."
  exit 1
fi

# Check for Ngrok (optional)
NGROK_AVAILABLE=false
if command_exists ngrok; then
  success "Ngrok is installed (optional)"
  NGROK_AVAILABLE=true
else
  warning "Ngrok is not installed. It's optional but recommended for webhook testing."
  echo "   Visit https://ngrok.com/download for installation instructions."
fi

# Check environment files
section "Checking Environment Files"

# Frontend environment file
FRONTEND_ENV_FILE="$PROJECT_ROOT/frontend/app/.env.development.local"
if [ -f "$FRONTEND_ENV_FILE" ]; then
  success "Frontend environment file exists"
else
  warning "Frontend environment file not found: $FRONTEND_ENV_FILE"
  
  create_frontend_env=$(prompt "Do you want to create a template frontend environment file? (y/n):")
  if [[ "$create_frontend_env" =~ ^[Yy]$ ]]; then
    cat > "$FRONTEND_ENV_FILE" << EOF
# Frontend Environment Configuration
VITE_BACKEND_URL=http://localhost:8080
VITE_SERVER_URL=http://localhost:8080
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key
VITE_DOCUMENSO_PUBLIC_URL=http://localhost:3000
VITE_ENV=development
EOF
    success "Created template frontend environment file at $FRONTEND_ENV_FILE"
    warning "Please update the Clerk publishable key in $FRONTEND_ENV_FILE"
  else
    warning "Skipping frontend environment file creation"
  fi
fi

# Backend environment file
BACKEND_ENV_FILE="$PROJECT_ROOT/backend/.env.development.local"
if [ -f "$BACKEND_ENV_FILE" ]; then
  success "Backend environment file exists"
  
  # Check if DOCUMENSO_SIGNING_PASSPHRASE is defined
  if grep -q "DOCUMENSO_SIGNING_PASSPHRASE" "$BACKEND_ENV_FILE"; then
    success "Documenso signing passphrase is configured"
  else
    warning "Documenso signing passphrase not found in backend environment file"
    echo "Adding DOCUMENSO_SIGNING_PASSPHRASE to backend environment file..."
    echo "DOCUMENSO_SIGNING_PASSPHRASE=teamezraapp" >> "$BACKEND_ENV_FILE"
    success "Added DOCUMENSO_SIGNING_PASSPHRASE to backend environment file"
  fi
else
  warning "Backend environment file not found: $BACKEND_ENV_FILE"
  
  create_backend_env=$(prompt "Do you want to create a template backend environment file? (y/n):")
  if [[ "$create_backend_env" =~ ^[Yy]$ ]]; then
    cat > "$BACKEND_ENV_FILE" << EOF
# Clerk
CLERK_SECRET_KEY=sk_test_your_clerk_secret_key
CLERK_WEBHOOK=whsec_your_clerk_webhook_secret
ADMIN_CLERK_ID=user_your_admin_clerk_id

# Server Configuration
PORT=8080
DOMAIN_URL=http://localhost
TEMP_DIR="/app/temp"

# Database Configuration
POSTGRES_USER=appuser
POSTGRES_PASSWORD=apppassword
POSTGRES_DB=appdb
POSTGRES_PORT=5432
POSTGRES_HOST=postgres
PG_URL=postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@\${POSTGRES_HOST}:\${POSTGRES_PORT}/\${POSTGRES_DB}?sslmode=disable

# Admin Credentials
ADMIN_FIRST_NAME=First
ADMIN_LAST_NAME=Landlord
ADMIN_EMAIL=admin@example.com

# Frontend Configuration
FRONTEND_PORT=5173

# SMTP Configuration
SMTP_PORT=587
SMTP_ENDPOINT_ADDRESS=email-smtp.example.com
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password
SMTP_TLS_MODE=starttls
SMTP_FROM=noreply@example.com
SMTP_TEST_EMAIL=test@example.com

# Documenso Integration
DOCUMENSO_HOST=documenso
DOCUMENSO_PORT=3000
DOCUMENSO_API_URL=http://\${DOCUMENSO_HOST}:\${DOCUMENSO_PORT}
DOCUMENSO_PUBLIC_URL=http://localhost:3000
DOCUMENSO_API_KEY=api_your_documenso_api_key
DOCUMENSO_WEBHOOK_SECRET=your_documenso_webhook_secret
DOCUMENSO_SIGNING_PASSPHRASE=teamezraapp

# Cron Job Authentication
CRON_SECRET_TOKEN=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)

# Application Environment
ENV=development
DEBUG_MODE=false
USE_AIR=true
EOF
    success "Created template backend environment file at $BACKEND_ENV_FILE"
    warning "Please update the Clerk, SMTP and other credentials in $BACKEND_ENV_FILE"
  else
    warning "Skipping backend environment file creation"
  fi
fi

# Documenso certificate setup
section "Setting Up Documenso Certificate"

# Create the documenso directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/docker/documenso"

# Check if the certificate already exists
if [ -f "$PROJECT_ROOT/docker/documenso/cert.p12" ]; then
  success "Documenso certificate already exists"
  echo "   Location: $PROJECT_ROOT/docker/documenso/cert.p12"
  echo "   Passphrase: teamezraapp"
else
  echo "Generating certificate for Documenso..."
  # Navigate to the documenso directory
  cd "$PROJECT_ROOT/docker/documenso"

  # Generate private key
  openssl genrsa -out private.key 2048

  # Generate self-signed certificate
  openssl req -new -x509 -key private.key -out certificate.crt -days 365 -subj "/CN=localhost"

  # Create p12 certificate with teamezraapp as the passphrase
  PASSPHRASE="teamezraapp"
  openssl pkcs12 -export -out cert.p12 -inkey private.key -in certificate.crt -legacy -passout pass:$PASSPHRASE

  # Set correct permissions
  chmod 644 cert.p12

  # Clean up temporary files
  rm private.key certificate.crt

  success "Certificate created successfully"
  echo "   Location: $PROJECT_ROOT/docker/documenso/cert.p12"
  echo "   Passphrase: $PASSPHRASE"
fi

# Ngrok setup
section "Ngrok Configuration"

if [ "$NGROK_AVAILABLE" = true ]; then
  success "Ngrok is available"
  
  # Check if NGROK_AUTHTOKEN is set
  if [ -n "$NGROK_AUTHTOKEN" ]; then
    success "Ngrok auth token is already set in the environment"
  else
    warning "NGROK_AUTHTOKEN environment variable is not set"
    
    get_token=$(prompt "Do you want to set the Ngrok auth token now? (y/n):")
    if [[ "$get_token" =~ ^[Yy]$ ]]; then
      token=$(prompt "Please enter your Ngrok auth token (from https://dashboard.ngrok.com/get-started/your-authtoken):")
      if [ -n "$token" ]; then
        export NGROK_AUTHTOKEN="$token"
        success "Ngrok auth token set for this session"
      else
        warning "No token provided, skipping Ngrok configuration"
      fi
    else
      warning "Skipping Ngrok token configuration"
    fi
  fi
else
  warning "Ngrok is not installed. Docker Compose will use the Ngrok container instead."
  
  get_token=$(prompt "Do you want to set the Ngrok auth token for the Ngrok container? (y/n):")
  if [[ "$get_token" =~ ^[Yy]$ ]]; then
    token=$(prompt "Please enter your Ngrok auth token (from https://dashboard.ngrok.com/get-started/your-authtoken):")
    if [ -n "$token" ]; then
      export NGROK_AUTHTOKEN="$token"
      success "Ngrok auth token set for this session"
    else
      warning "No token provided, Docker Compose may fail to start the Ngrok container"
    fi
  else
    warning "Skipping Ngrok token configuration. Docker Compose may fail to start the Ngrok container."
  fi
fi

# Create docker network for Documenso if it doesn't exist
section "Creating Docker Network"
if docker network inspect app-network >/dev/null 2>&1; then
  success "Docker network 'app-network' already exists"
else
  echo "Creating Docker network 'app-network'..."
  docker network create app-network
  if [ $? -eq 0 ]; then
    success "Docker network 'app-network' created successfully"
  else
    error "Failed to create Docker network 'app-network'"
  fi
fi

# Ask if user wants to start the application
section "Starting the Application"

start_app=$(prompt "Do you want to start the application now? (y/n):")
if [[ "$start_app" =~ ^[Yy]$ ]]; then
  echo "Starting the application with Docker Compose..."
  
  # Check if Docker is running
  if ! docker info > /dev/null 2>&1; then
    error "Docker is not running. Please start Docker and try again."
    exit 1
  fi
  
  # Start with docker-compose
  if [ -n "$NGROK_AUTHTOKEN" ]; then
    docker-compose up -d
    start_status=$?
  else
    warning "No Ngrok auth token provided, starting without Ngrok..."
    # Start docker-compose but remove the ngrok service
    docker-compose up -d --scale ngrok=0
    start_status=$?
  fi
  
  if [ $start_status -eq 0 ]; then
    success "Application started successfully!"
    
    echo ""
    echo -e "${GREEN}The following services are now running:${NC}"
    echo "- Frontend: http://localhost:5173"
    echo "- Backend API: http://localhost:8080"
    echo "- Documenso: http://localhost:3000"
    
    if [ -n "$NGROK_AUTHTOKEN" ]; then
      echo ""
      echo -e "${YELLOW}Ngrok tunnel:${NC}"
      echo "1. Visit the Ngrok dashboard at http://localhost:4040"
      echo "2. Get your public URL from the dashboard"
      echo "3. Use this URL to configure webhooks in Clerk and Documenso:"
      echo "   - Clerk webhook URL: YOUR_NGROK_URL/webhooks/clerk"
      echo "   - Documenso webhook URL: YOUR_NGROK_URL/webhooks/documenso"
    fi
    
    echo ""
    echo -e "${BLUE}Useful Commands:${NC}"
    echo "- View logs: docker-compose logs -f"
    echo "- Stop the application: docker-compose down"
    echo "- Rebuild and restart: docker-compose up -d --build"
    
    # Add cron jobs information
    echo ""
    echo -e "${YELLOW}Cron Jobs:${NC}"
    echo "The following cron jobs are configured to run at midnight:"
    echo "- Expire leases: Updates lease status to 'expired' when end date is reached"
    echo "- Notify expiring: Sends notifications for leases expiring within 60 days"
    echo ""
    echo "To test these jobs manually, use:"
    echo "curl -X GET http://localhost:8080/cron/leases/expire -H \"Authorization: Bearer YOUR_CRON_SECRET_TOKEN\""
    echo "curl -X POST http://localhost:8080/cron/leases/notify-expiring -H \"Authorization: Bearer YOUR_CRON_SECRET_TOKEN\""
  else
    error "Failed to start the application. Please check Docker Compose logs."
  fi
else
  echo ""
  echo -e "${YELLOW}To start the application manually:${NC}"
  echo "1. Navigate to the project root directory"
  echo "2. Run: NGROK_AUTHTOKEN=your_token docker-compose up -d"
  echo ""
  echo "To start without Ngrok:"
  echo "1. Navigate to the project root directory"
  echo "2. Run: docker-compose up -d --scale ngrok=0"
fi

echo ""
echo -e "${BLUE}==========================================================${NC}"
echo -e "${GREEN}                 Setup process completed                   ${NC}"
echo -e "${BLUE}==========================================================${NC}"