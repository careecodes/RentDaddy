# RentDaddy Project Structure

## Overview

This document explains the RentDaddy application structure, how the components relate to each other, and best practices for development and deployment.

## Project Structure

```
RentDaddy/
├── frontend/          # React frontend application
│   └── app/           # Main frontend application
├── backend/           # Go backend API
│   ├── cmd/           # Command-line applications
│   ├── internal/      # Internal packages
│   │   ├── db/        # Database layer
│   │   ├── smtp/      # Email service
│   │   ├── templates/ # Email templates
│   │   └── utils/     # Utility functions
│   ├── pkg/           # Public packages
│   │   └── handlers/  # HTTP handlers
│   └── scripts/       # Utility scripts
│       └── cmd/       # Command-line utilities
│           ├── cron/  # Cron job scripts
│           └── seed_users_with_clerk/ # User seeding
├── deployment/        # Deployment configuration
│   └── scripts/       # Deployment scripts
├── docker/            # Docker configuration
│   └── documenso/     # Documenso certificates
├── setup.sh           # Setup script for development
└── docker-compose.yml # Local development services
```

## Core Components

### Backend (Go)

- **API Server**: Handles HTTP requests, authentication, and business logic
- **Database Layer**: PostgreSQL with generated code from sqlc
- **Handlers**: RESTful API endpoints for frontend communication
- **Cron Jobs**: Scheduled tasks for lease expiration and notifications
- **Utils**: Shared utility functions and helpers

### Frontend (React/Vite)

- **React Application**: User interface for tenants and landlords
- **Pages**: Application screens and views
- **Components**: Reusable UI elements
- **Providers**: Authentication and context providers

### Services

- **Documenso**: Document signing service with its own database
- **Postgres**: Main database for application data
- **Clerk**: Authentication service (external)

## Development Environment

The development environment uses Docker Compose to run all services locally:

1. **Setup Script**: `setup.sh` automates environment configuration
2. **Docker Compose**: `docker-compose.yml` defines all services
3. **Environment Files**: 
   - Backend: `.env.development.local`
   - Frontend: `.env.development.local`

## Deployment

The production environment is deployed to AWS using:

1. **ECS**: Container orchestration for all services
2. **Terraform**: Infrastructure as code in `deployment/simplified_terraform`
3. **ECR**: Container registry for Docker images
4. **Secrets Manager**: Secure storage for sensitive credentials

## Key Connection Points

1. **Backend ↔ Frontend**: REST API communication
2. **Backend ↔ Documenso**: Direct API integration and webhook handling
3. **Backend ↔ Database**: Direct SQL through generated code
4. **All Services ↔ Authentication**: Clerk integration

## Simplified Structure for Local Development

For optimal local development:

1. **Use the setup script**: `./setup.sh` handles most configuration
2. **Run everything with Docker Compose**: `docker-compose up -d`
3. **Configure webhooks via Ngrok**: For Clerk and Documenso callbacks

## Simplified Structure for Production

For production deployment:

1. **Build the containers**: `./deployment/scripts/build_and_deploy_latest.sh --all`
2. **Apply Terraform**: `cd deployment/simplified_terraform && terraform apply`
3. **Check services**: `./deployment/scripts/describe_services.sh`

## Configuration Best Practices

1. **Keep credentials out of code**: Use environment variables
2. **Consistent naming**: Follow established patterns
3. **Documentation**: Comment non-obvious configurations
4. **Separation of concerns**: Each component has a specific responsibility
5. **Environment parity**: Keep development and production as similar as possible