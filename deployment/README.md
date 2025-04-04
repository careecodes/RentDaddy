# RentDaddy AWS Deployment Guide

This guide outlines how to deploy the RentDaddy application to AWS using a hybrid approach with EC2 instances.
## Architecture Overview

- **Main Application ECS Service**: t3.micro instances (EC2 free tier)
  - Backend (Go) container
  - Frontend (React/TypeScript/Vite) container
  - PostgreSQL container
  - Deployed as ECS service with EC2 launch type
  
- **Document Signing ECS Service**: t3.small instances
  - Documenso container
  - PostgreSQL container
  - Deployed as separate ECS service with EC2 launch type

The application uses Amazon ECS (Elastic Container Service) with EC2 launch type to manage containerized deployments while leveraging free tier eligible instances where possible.

## Resource Requirements

| Component | Instance Type | Memory | vCPU | Monthly Cost |
|-----------|--------------|--------|------|--------------|
| Main Application | t3.micro | 1GB | 1 | Free tier eligible |
| Documenso | t3.small | 2GB | 2 | ~$15-20/month |

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Environment Configuration](#environment-configuration)
4. [Deployment Options](#deployment-options)
5. [GitHub Actions Deployment](#github-actions-deployment)
6. [Manual Deployment](#manual-deployment)
7. [Terraform Deployment](#terraform-deployment)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Security Best Practices](#security-best-practices)


## Prerequisites

- AWS account with access credentials
- AWS CLI installed and configured
- GitHub account with repository access
- GitHub CLI (`gh`) installed for secrets management
- SSH key pair generated and available
  - Generate with: `ssh-keygen -t rsa -b 4096 -f ~/.ssh/rentdaddy_key`
  - Set permissions: `chmod 400 ~/.ssh/rentdaddy_key`
  - The public key (`~/.ssh/rentdaddy_key.pub`) will be uploaded to AWS
- Docker and Docker Compose (for local testing)
- Git installed
- Terraform (optional, for IaC deployment)

## Project Structure

After integrating the deployment resources, your project will have the following structure:

```
.
├── README.md
├── assets/
├── backend/
├── frontend/
├── docker-compose.yml
├── deployment/
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── scripts/
│   │   ├── deploy-main.sh
│   │   ├── deploy-documenso.sh
│   │   ├── setup-monitoring.sh
│   │   └── upload-env-secrets.sh
│   └── docker/
│       └── documenso-compose.yml
├── .github/
│   └── workflows/
│       └── aws-deploy.yml
└── production/                   # Environment files (not committed)
    ├── .env.vars
    └── .env.secret.vars
```

## Environment Configuration

Two environment files are used for deployment:

1. `.env.vars`: Regular environment variables
2. `.env.secret.vars`: Secret environment variables

These should be stored in the `deployment/` directory and uploaded to GitHub using the provided script. Never commit these files to the repository.

### Example Environment Structure

Your environment files should be structured as follows:

```bash
# production/.env.vars (Non-sensitive variables)
VITE_PORT=8080
VITE_DOMAIN_URL=http://your-ec2-ip
PORT=8080
DOMAIN_URL=http://your-ec2-ip
TEMP_DIR="/app/temp"
POSTGRES_USER=appuser
POSTGRES_DB=appdb
POSTGRES_PORT=5432
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User
ADMIN_EMAIL=admin@example.com
FRONTEND_PORT=5173
CLERK_SIGN_IN_URL=/sign-in/*
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
SMTP_PORT=587
SMTP_ENDPOINT_ADDRESS=email-smtp.example.com
SMTP_TLS_MODE=starttls
SMTP_FROM=notifications@example.com
SMTP_TEST_EMAIL=test@example.com
s3Region=us-east-1
s3Bucket=rentdaddydocumenso
s3BaseURL="https://s3.us-east-1.amazonaws.com"
DOCUMENSO_HOST=your-documenso-ip
DOCUMENSO_PORT=3000
ENV=production
```

```bash
# production/.env.secret.vars (Sensitive variables)
VITE_CLERK_PUBLISHABLE_KEY=pk_xxxx
CLERK_SECRET_KEY=sk_xxxx
CLERK_WEBHOOK=whsec_xxxx
POSTGRES_PASSWORD=secure-password
PG_URL=postgresql://appuser:secure-password@postgres:5432/appdb
SMTP_USER=smtp-username
SMTP_PASSWORD=smtp-password
awsAccessID=AKIAXXXXXXXX
awsSecret=XXXXXXXXXXXXXXX
DOCUMENSO_API_KEY=documenso-api-key
DOCUMENSO_WEBHOOK_SECRET=webhook-secret
```

## Deployment Options

The application is deployed using AWS ECS with the following options:

1. **GitHub Actions Deployment**: Using GitHub's CI/CD pipeline (recommended)
   - Builds and pushes Docker images to Amazon ECR
   - Deploys updated task definitions to ECS
   - Sets up required infrastructure with Terraform

2. **Manual Deployment**: Using AWS CLI and shell scripts
   - Build and push images manually
   - Deploy task definitions using AWS CLI commands

3. **Terraform Deployment**: Using Infrastructure as Code
   - Provision all AWS resources including ECS cluster, services, and task definitions
   - Configure networking, load balancers, and security groups

## GitHub Actions Deployment

### Step 1: Set up GitHub Environment Secrets

Run the script to upload environment variables to GitHub:

```bash
chmod +x deployment/scripts/upload-env-secrets.sh
./deployment/scripts/upload-env-secrets.sh
```

### Step 2: Required GitHub Environment Secrets

The following secrets should be set in your GitHub production environment:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key 
- `SSH_PRIVATE_KEY`: Private SSH key for EC2 access
- `POSTGRES_PASSWORD`: Database password
- `CLERK_SECRET_KEY`: Clerk authentication secret
- `CLERK_WEBHOOK`: Clerk webhook secret
- `SMTP_PASSWORD`: SMTP service password
- `SMTP_USER`: SMTP service username
- `awsSecret`: AWS S3 secret key
- `DOCUMENSO_API_KEY`: API key for Documenso
- `DOCUMENSO_WEBHOOK_SECRET`: Webhook secret for Documenso
- `NEXTAUTH_SECRET`: NextAuth secret for Documenso
- `NEXT_PRIVATE_ENCRYPTION_KEY`: Encryption key for Documenso
- `NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY`: Secondary encryption key
- `PG_URL`: Full PostgreSQL connection string

### Step 3: Required GitHub Environment Variables

The following variables should be set in your GitHub production environment:

- `AWS_REGION`: AWS region to deploy to (e.g., us-east-1)
- `SSH_KEY_NAME`: Name of the key pair in AWS
- `VITE_CLERK_PUBLISHABLE_KEY`: Clerk publishable key (frontend)
- `VITE_PORT`: Vite server port (default: 8080)
- `VITE_DOMAIN_URL`: Domain URL for frontend
- `PORT`: Backend server port (default: 8080)
- `DOMAIN_URL`: Backend domain URL
- `TEMP_DIR`: Temporary directory path (default: "/app/temp")
- `POSTGRES_USER`: Database username (default: appuser)
- `POSTGRES_DB`: Database name (default: appdb)
- `POSTGRES_PORT`: Database port (default: 5432)
- `ADMIN_FIRST_NAME`: Admin user first name
- `ADMIN_LAST_NAME`: Admin user last name
- `ADMIN_EMAIL`: Admin user email
- `FRONTEND_PORT`: Frontend port (default: 5173)
- `CLERK_SIGN_IN_URL`: Clerk sign-in URL
- `CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`: Fallback URL after sign-in
- `CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`: Fallback URL after sign-up
- `SMTP_PORT`: SMTP port (default: 587)
- `SMTP_ENDPOINT_ADDRESS`: SMTP server address
- `SMTP_TLS_MODE`: SMTP TLS mode (options: "starttls" or "tls")
- `SMTP_FROM`: SMTP from email address
- `SMTP_TEST_EMAIL`: Test email address
- `s3Region`: AWS S3 region (default: us-east-1)
- `s3Bucket`: S3 bucket name
- `s3BaseURL`: S3 base URL
- `awsAccessID`: AWS S3 access ID
- `DOCUMENSO_HOST`: Documenso host
- `DOCUMENSO_PORT`: Documenso port (default: 3000)
- `ENV`: Application environment (development/staging/production)

### Step 4: Deploy Using GitHub Actions

- Push to the main branch or manually trigger the workflow
- The workflow will:
  - Deploy infrastructure with Terraform
  - Set up both EC2 instances
  - Deploy the applications with proper configurations
  - Set up monitoring

## Manual Deployment

### Step 1: Prepare Environment Files

Create a `.env` file from the provided template:

```bash
cp env.example .env
# Edit .env with appropriate values
```

### Step 2: Launch EC2 Instances

1. Launch a t3.micro instance for the main application
   - Use Amazon Linux 2 AMI
   - Configure security group to allow ports: 22 (SSH), 80 (HTTP), 8080 (Backend), 5173 (Frontend dev server)
   - Add a tag with Key=Name, Value=rentdaddy-main

2. Launch a t3.small instance for Documenso
   - Use Amazon Linux 2 AMI
   - Configure security group to allow ports: 22 (SSH), 3000 (Documenso app)
   - Add a tag with Key=Name, Value=rentdaddy-documenso

### Step 3: Run Deployment Scripts

Deploy the main application:

```bash
cd deployment/scripts
chmod +x deploy-main.sh
./deploy-main.sh <main-instance-ip> <path-to-ssh-key>
```

Deploy Documenso:

```bash
chmod +x deploy-documenso.sh
./deploy-documenso.sh <documenso-instance-ip> <path-to-ssh-key> <main-instance-private-ip>
```

Set up monitoring:

```bash
chmod +x setup-monitoring.sh
./setup-monitoring.sh <main-instance-ip> <path-to-ssh-key> main
./setup-monitoring.sh <documenso-instance-ip> <path-to-ssh-key> documenso
```

## Terraform Deployment

### Step 1: Initialize Terraform

```bash
cd deployment/terraform
terraform init
```

### Step 2: Configure Variables

Create a `terraform.tfvars` file:

```hcl
aws_region = "us-east-1"  # Change to your preferred region
key_name = "your-key-pair-name"
```

### Step 3: Deploy Infrastructure

```bash
terraform plan -out=tfplan
terraform apply tfplan
```

### Step 4: Deploy Application

After the infrastructure is created, use the deployment scripts with the IPs provided by Terraform:

```bash
cd ../scripts
chmod +x deploy-main.sh deploy-documenso.sh

# Get IPs from Terraform outputs
MAIN_IP=$(cd ../terraform && terraform output -raw main_app_public_ip)
DOC_IP=$(cd ../terraform && terraform output -raw documenso_public_ip)
MAIN_PRIVATE_IP=$(cd ../terraform && terraform output -raw main_app_private_ip)

# Deploy applications
./deploy-main.sh $MAIN_IP <path-to-ssh-key>
./deploy-documenso.sh $DOC_IP <path-to-ssh-key> $MAIN_PRIVATE_IP
```

## Monitoring and Maintenance

### CloudWatch Monitoring

The `setup-monitoring.sh` script configures CloudWatch monitoring for both instances, which provides:

- CPU, memory, and disk usage metrics
- System and application logs
- Custom Docker container metrics

### Health Checks

Automated health checks run every 5 minutes to ensure all services are operational. If a service is down, it will be automatically restarted.

### Database Backups

Automated backups run daily for both PostgreSQL databases:
- Main application: Daily at 1:00 AM
- Documenso: Daily at 2:00 AM

Backups are stored on the EC2 instances in the `/home/ec2-user/backups` directory. Consider setting up a script to copy these to S3 for long-term storage.

### Updating the Application

To update the application:

1. **Using GitHub Actions**:
   - Push changes to the main branch
   - The workflow will automatically redeploy

2. **Manual Update**:
   ```bash
   # SSH into the instance
   ssh -i <key-path> ec2-user@<main-instance-ip>
   cd ~/app
   git pull
   docker-compose up -d --build
   ```

## Troubleshooting

### Common Issues

1. **Connection Refused Errors**
   - Check security group rules
   - Verify the service is running: `docker ps`
   - Check service logs: `docker logs <container-name>`

2. **Database Connection Issues**
   - Verify database credentials in `.env` files
   - Check if the PostgreSQL container is running
   - Verify network connectivity between instances

3. **Out of Memory Errors**
   - Check CloudWatch metrics for memory usage
   - Consider optimizing container memory limits
   - For persistent issues, upgrade the instance type

### Log Locations

- System logs: `/var/log/messages`
- Docker container logs: `docker logs <container-name>`
- Application logs: Inside containers at `/app/logs`
- Service restart logs: `/home/ec2-user/service-restarts.log`
- Monitoring logs: `/home/ec2-user/monitoring/`

## Security Best Practices

### Credentials Management

1. **Never hardcode credentials** in your application code
2. Use GitHub Environment Secrets or AWS Parameter Store for sensitive data
3. Rotate API keys and passwords regularly

### Network Security

1. Configure security groups to allow only necessary traffic
2. Use private subnets for databases when possible
3. Implement a Web Application Firewall (WAF) for production deployments

### Updates and Patches

1. Keep EC2 instances updated with the latest security patches
2. Update Docker images regularly to address vulnerabilities
3. Monitor security bulletins for dependencies used in your application

### Data Protection

1. Enable encryption for sensitive data at rest
2. Implement regular backups with versioning
3. Test restoration procedures periodically

---

## Next Steps

1. **Set up proper domain name and SSL certificates** using Route 53 and ACM
2. Consider moving the database to **Amazon RDS** for better management and backups
3. Implement **enhanced monitoring and alerting** for production environments
4. Set up **auto-scaling** for handling traffic spikes if needed