![image](frontend/app/public/logo.png)

# Ezra

EZRA is a modern apartment management platform written in Go. It
streamlines property management by offering a robust solution for tenant
management, maintenance tracking, lease management, and comprehensive reporting.
Designed for scalability and security, EZRA is ideal for property managers
looking to simplify their workflow.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Configuration](#configuration)
  - [Administrator Setup](#administrator-setup)
- [Usage](#usage)
  - [Running the Application](#running-the-application)
  - [Seed Test Data](#seed-test-data)
- [Development](#development)
  - [Project Structure](#project-structure)
  - [Development Tasks with Taskfile](#development-tasks-with-taskfile)
  - [Environment Files](#environment-files)
  - [Testing](#testing)
  - [Linting & Formatting](#linting--formatting)
- [Documenso Integration](#documenso-integration)
- [Cron Jobs](#cron-jobs)
- [AWS Deployment](#aws-deployment)
  - [Prerequisites](#prerequisites)
  - [Environment Setup](#environment-setup)
  - [Parameterized Terraform Configuration](#parameterized-terraform-configuration)
  - [Build and Deploy](#build-and-deploy)
  - [Detailed Deployment Guide](#detailed-deployment-guide)
  - [Monitoring Deployed Services](#monitoring-deployed-services)

## Features

- **Tenant Management:** Organize tenant details, lease agreements, and payment histories.
- **Maintenance Requests:** Efficiently handle repair and service requests.
- **Tennant Complaints**: Get notified when a tenant has a issue, keep track of
  them all in one place
- **User Roles & Permissions:** Customize access for Owners, property managers,
  and tenants.

## Getting Started

Follow these steps to set up the project on your local machine for development
or testing.

### Prerequisites

- **Go:** Version 1.16 or higher
- **Database:** PostgreSQL (or any supported SQL database)
- **Node.js:** Ensure you have Node.js installed.
- **NPM:** Ensure you have NPM installed.
- **Docker**: Ensure you have docker and docker-compose installed.
- **SMTP Server**: A functional SMTP server

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/Team-Rent-Daddy/RentDaddy/ EZRA
   cd EZRA
   ```

2. **Install Dependencies**

   2a. **Frontend**

   ```bash
   cd frontend/app
   npm i
   ```

   2b. **Backend**

   With Go modules enabled, download all required dependencies:

   ```bash
   cd backend
   go mod download
   ```

3. **Set Up the Database**

   Update your database settings in the configuration file (see [Configuration](#configuration)).

4. **Run Migrations**

   If using a migration tool (e.g., [migrate](https://github.com/golang-migrate/migrate)):

   ```bash
   migrate -path ./migrations -database "$DATABASE_URL" up
   ```

## Configuration

Create a `.env` file in the project root to manage environment-specific
variables. The simplest method to do so is running the command below:

```bash
cp .env.example .env
```

And then edit it using your favorite text editor.

Here is a bit more information regarding SMTP setup and functionality: [SMTP
README](./backend/internal/smtp/SMTP_README.md)

> **Note:** Replace the placeholder values with your actual configuration.

### Administrator Setup

The system requires at least one administrator account to function properly. The application will automatically handle admin setup in the following way:

1. When a user signs in through Clerk, the frontend will check if any admin exists in the database
2. If no admin user exists, the first user to sign in will be automatically designated as an admin
3. This process happens automatically during application initialization

For local development:

1. Ensure Clerk authentication is properly configured with your API keys
2. Make sure the backend is running and connected to the database
3. Sign in with your Clerk account - the first user to sign in will become the admin automatically
4. This admin user will have full access to all system features, including Documenso configuration

**Environment Variables:**
- `ADMIN_FIRST_NAME` and `ADMIN_LAST_NAME`: Optional - if set, they'll be used to match specific users as admins
- `CLERK_WEBHOOK`: Required - the Clerk webhook signing secret for authenticating webhook requests

**Troubleshooting:**
- If you need to manually set up an admin user, you can use the `/setup/admin` endpoint:
  ```bash
  curl -X POST http://localhost:8080/setup/admin \
    -H "Content-Type: application/json" \
    -d '{"clerk_id": "YOUR_CLERK_USER_ID"}'
  ```
- To check if an admin exists in the system, use the `/check-admin` endpoint:
  ```bash
  curl http://localhost:8080/check-admin
  ```

## Usage

### Running the Application

#### Local Development with Docker Compose

The easiest way to run the application in development mode is to use our automated setup script:

```bash
# Make the script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

The setup script will:
1. Check for required dependencies (Docker, Docker Compose, OpenSSL)
2. Create environment files if needed
3. Generate a certificate for Documenso
4. Configure Ngrok for webhook testing
5. Start all services with Docker Compose

##### Services

When running, the application includes:
- Frontend on http://localhost:5173
- Backend API on http://localhost:8080
- Postgres database on port 5432
- Documenso on http://localhost:3000
- Documenso worker for document processing
- Ngrok tunnel exposing your backend API to the internet

##### Configure Webhooks with Ngrok URL

Access the Ngrok dashboard at http://localhost:4040 to get your public URL. Use this URL to configure:

1. Clerk webhooks (for authentication) - add `/webhooks/clerk` to your Ngrok URL
2. Documenso webhooks (for document signing) - add `/webhooks/documenso` to your Ngrok URL

##### Manual Setup (Alternative)

If you prefer to set up the environment manually:

1. Create a certificate for Documenso:
   ```bash
   mkdir -p docker/documenso
   cd docker/documenso
   openssl genrsa -out private.key 2048
   openssl req -new -x509 -key private.key -out certificate.crt -days 365 -subj "/CN=localhost"
   openssl pkcs12 -export -out cert.p12 -inkey private.key -in certificate.crt -legacy -passout pass:teamezraapp
   chmod 644 cert.p12
   rm private.key certificate.crt
   ```

2. Start the application:
   ```bash
   NGROK_AUTHTOKEN=your_ngrok_authtoken docker-compose up -d
   ```

#### Seed Test Data

To populate the database with test data:

```bash
# Using the Taskfile utility
cd backend
task seed:users

# Or directly with Docker
docker exec rentdaddy-backend sh -c "cd /app && go run scripts/cmd/seed_users_with_clerk/main.go scripts/cmd/seed_users_with_clerk/seed_users.go"
```

#### Running Components Individually

**Backend:**
```bash
cd backend
go run server.go
```

**Frontend:**
```bash
cd frontend/app
npm run dev
```

**Documenso Worker:**
```bash
cd worker/documenso-worker
go run main.go
```

Access the frontend by navigating to `http://localhost:3000`.

## Development

### Project Structure

```bash
EZRA/
├── frontend/          # Vite/React frontend
│   └── app/           # Main frontend application
├── backend/           # Go/SQL Backend
│   ├── cmd/           # Command-line applications
│   ├── internal/      # Internal packages (not exported)
│   │   ├── db/        # Database access layer
│   │   ├── smtp/      # Email service
│   │   ├── templates/ # Email templates
│   │   └── utils/     # Utility functions
│   ├── pkg/           # Public packages
│   │   └── handlers/  # HTTP handlers
│   └── scripts/       # Maintenance and utility scripts
│       └── cmd/       # Command-line utility scripts
│           ├── cron/  # Cron job scripts
│           └── seed_users_with_clerk/ # User seeding utility
├── worker/            # Worker applications
│   └── documenso-worker/ # Document signing worker
├── deployment/        # Deployment configuration and scripts
│   └── scripts/       # Deployment scripts
└── README.md          # Project documentation
```

### Development Tasks with Taskfile

The project uses [Taskfile](https://taskfile.dev/) to manage common development tasks. Navigate to the `backend` directory to use these tasks:

```bash
cd backend

# Run all tests
task test:all

# Test only changed files
task test:changed

# Run database migrations
task migrate:up

# Generate SQL code from queries
task sqlc:generate

# Seed test users
task seed:users

# Run the Documenso worker (from project root)
cd ..
task worker:run
```

### Environment Files

The project uses environment files for configuration:

```bash
# Development environment
cp .env.example .env.development
# Edit with your development settings

# Production environment
cp .env.example .env.production
# Edit with your production settings
```

Important environment variables include:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Database connection
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: Email configuration
- `CLERK_SECRET_KEY`, `CLERK_WEBHOOK`: Authentication configuration
- `DOCUMENSO_*`: Document signing service configuration

### Testing

Run tests with:

```bash
# Using Taskfile
task test:all

# Or directly with Go
go test -v ./...
```

### Linting & Formatting

- **Backend Formatting:** Format Go code with:

  ```bash
  gofmt -s -w .
  ```

- **Frontend Linting:** 

  ```bash
  cd frontend/app
  npm run lint
  ```

## Documenso Integration

The system integrates with Documenso for document signing capabilities:

### Worker Configuration

The Documenso worker runs as a separate service to process document signing requests:

```bash
# Run the worker locally
cd worker/documenso-worker
go run main.go

# Or using Taskfile
task worker:run
```

### Environment Variables

Configure Documenso with these environment variables:

```
DOCUMENSO_API_KEY=your_api_key
DOCUMENSO_WEBHOOK_SECRET=your_webhook_secret
DOCUMENSO_API_URL=https://api.documenso.com
```

### Webhook Configuration

The system automatically processes document status updates through webhooks. The webhook endpoint is:

```
https://your-api-domain.com/webhooks/documenso
```

## Cron Jobs

The system has several scheduled tasks that run automatically:

### Lease Notifications

The system sends notifications about upcoming lease renewals and expirations:

```bash
# Trigger lease expiry manually (using cron endpoint)
curl -X GET http://localhost:8080/cron/leases/expire -H "Authorization: Bearer YOUR_CRON_SECRET_TOKEN"

# Trigger expiry notifications manually (using cron endpoint)
curl -X POST http://localhost:8080/cron/leases/notify-expiring -H "Authorization: Bearer YOUR_CRON_SECRET_TOKEN"

# Test lease notification functionality (admin endpoint, requires login)
./scripts/test-lease-notify.sh
```

### Cron Configuration

In production environments, cron jobs are configured using the file at `/backend/scripts/cmd/cron/leases-cron`:

```
# Runs daily at midnight to process expired leases and send notifications
0 0 * * * . /app/.env && curl -X GET ${DOMAIN_URL}:${PORT}/cron/leases/expire -H "Authorization: Bearer ${CRON_SECRET_TOKEN}" >> /var/log/cron.log 2>&1
0 0 * * * . /app/.env && curl -X POST ${DOMAIN_URL}:${PORT}/cron/leases/notify-expiring -H "Authorization: Bearer ${CRON_SECRET_TOKEN}" >> /var/log/cron.log 2>&1
```

The `CRON_SECRET_TOKEN` environment variable must be set to a secure random string to authenticate the cron job requests.

### Running Cron Jobs Locally

```bash
# Simulate all cron jobs locally
./scripts/simulate-cron.sh
```

## AWS Deployment

The project is set up to deploy to AWS using Terraform and ECS. Developers can deploy to their own AWS account with the following steps:

### Prerequisites

1. AWS Account and CLI configured locally
2. Terraform installed
3. Docker installed

### Environment Setup

1. Create required environment files for production:

   ```bash
   # Create backend environment file
   cp ./backend/.env.example ./backend/.env.production.local
   
   # Create frontend environment file
   cp ./frontend/app/.env.example ./frontend/app/.env.production.local
   ```

2. Update the environment files with your specific AWS and application settings:

   **Important variables:**
   - `AWS_ACCOUNT_ID`: Your AWS account ID
   - `AWS_REGION`: AWS region to deploy to (e.g., us-east-2)
   - `VITE_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key
   - `CLERK_SECRET_KEY`: Your Clerk secret key
   - Database credentials
   - SMTP settings
   - Documenso API keys

### Parameterized Terraform Configuration

We've created a parameterized version of the Terraform configuration that allows developers to use their own AWS accounts. The key files are:

- `deployment/simplified_terraform/main.tf.parameterized`: Terraform configuration with variables
- `deployment/simplified_terraform/terraform.tfvars.example`: Example variables file to customize
- `deployment/AWS-DEPLOYMENT-GUIDE.md`: Comprehensive guide for AWS deployment

To use the parameterized configuration:

```bash
cd deployment/simplified_terraform
cp main.tf.parameterized main.tf
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your AWS account details
```

### Build and Deploy

```bash
# Build and push the container images to ECR
./deployment/scripts/build_and_deploy_latest.sh --all

# Deploy with Terraform (first time)
cd deployment/simplified_terraform
terraform init
terraform apply -var "deploy_version=$(date +%s)" -var "debug_mode=true"

# Force new deployment of existing services
./deployment/scripts/force_new_deployment_all.sh
```

### Detailed Deployment Guide

For a complete step-by-step guide with detailed instructions for setting up all required AWS resources, refer to the [AWS Deployment Guide](./deployment/AWS-DEPLOYMENT-GUIDE.md).

### Monitoring Deployed Services

```bash
# View service status
./deployment/scripts/describe_services.sh

# Check latest logs
./deployment/scripts/latest_logs.sh

# Monitor the Documenso worker
./deployment/scripts/monitor_documenso_worker.sh
```
