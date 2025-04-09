# AWS Deployment Guide for RentDaddy

This guide will help you deploy the RentDaddy application to your own AWS account using Terraform.

## Prerequisites

Before beginning deployment, ensure you have the following:

1. **AWS Account**: An active AWS account with admin privileges
2. **AWS CLI**: Installed and configured with your AWS credentials
3. **Terraform**: Version 1.0.0 or newer
4. **Domain Name**: A domain name that you own, accessible for DNS configuration
5. **Route53 Zone**: A Route53 hosted zone for your domain
6. **Docker**: For building and pushing container images
7. **Git**: For cloning the repository and working with the codebase

## Step 1: Set Up Your AWS Environment

### Configure AWS CLI

```sh
aws configure
```

Enter your AWS access key, secret key, default region (e.g., us-east-2), and preferred output format (json).

### Create ECR Repositories

Create the necessary ECR repositories for your Docker images:

```sh
aws ecr create-repository --repository-name rentdaddy/backend
aws ecr create-repository --repository-name rentdaddy/frontend
aws ecr create-repository --repository-name rentdaddy-main
```

### Create an EC2 Key Pair for SSH Access

```sh
aws ec2 create-key-pair --key-name rentdaddy_key --query 'KeyMaterial' --output text > rentdaddy_key.pem
chmod 400 rentdaddy_key.pem
```

### Set Up Secrets in AWS Secrets Manager

Create two secrets in AWS Secrets Manager:

1. **Main App Secret**:
   ```sh
   aws secretsmanager create-secret --name rentdaddy/production/main-app \
     --description "RentDaddy Main Application Credentials" \
     --secret-string '{
       "CLERK_SECRET_KEY": "your_clerk_secret_key",
       "CLERK_WEBHOOK": "your_clerk_webhook_secret",
       "ADMIN_CLERK_ID": "your_admin_clerk_id",
       "VITE_CLERK_PUBLISHABLE_KEY": "your_clerk_publishable_key",
       "POSTGRES_PASSWORD": "secure_postgres_password",
       "PG_URL": "postgresql://appuser:secure_postgres_password@main-postgres:5432/appdb",
       "SMTP_USER": "your_smtp_username",
       "SMTP_PASSWORD": "your_smtp_password",
       "DOCUMENSO_API_KEY": "your_documenso_api_key",
       "DOCUMENSO_WEBHOOK_SECRET": "your_documenso_webhook_secret",
       "OPENAI_API_KEY": "your_openai_api_key_if_needed"
     }'
   ```

2. **Documenso Secret**:
   ```sh
   aws secretsmanager create-secret --name rentdaddy/production/documenso \
     --description "RentDaddy Documenso Credentials" \
     --secret-string '{
       "POSTGRES_PASSWORD": "secure_documenso_postgres_password",
       "NEXTAUTH_SECRET": "random_secure_string_32chars_or_more",
       "NEXT_PRIVATE_ENCRYPTION_KEY": "random_secure_string_32chars",
       "NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY": "random_secure_string_32chars",
       "NEXT_PRIVATE_SIGNING_PASSPHRASE": "teamezraapp",
       "NEXT_PRIVATE_SMTP_PASSWORD": "your_smtp_password",
       "NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY": "your_s3_secret_access_key",
       "NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID": "your_s3_access_key_id"
     }'
   ```

### Create an S3 Bucket for Documenso

```sh
aws s3 mb s3://rentdaddydocumenso-YOURAWSACCOUNTID --region us-east-2
```

Make sure to replace `YOURAWSACCOUNTID` with your AWS account ID.

## Step 2: Build and Push Docker Images

### Backend Image

```sh
cd /path/to/RentDaddy/backend
docker build -t rentdaddy/backend:latest -f Dockerfile.prod .
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin YOURAWSACCOUNTID.dkr.ecr.us-east-2.amazonaws.com
docker tag rentdaddy/backend:latest YOURAWSACCOUNTID.dkr.ecr.us-east-2.amazonaws.com/rentdaddy/backend:latest
docker push YOURAWSACCOUNTID.dkr.ecr.us-east-2.amazonaws.com/rentdaddy/backend:latest
```

### Frontend Image

```sh
cd /path/to/RentDaddy/frontend/app
docker build -t rentdaddy/frontend:prod -f Dockerfile.prod .
docker tag rentdaddy/frontend:prod YOURAWSACCOUNTID.dkr.ecr.us-east-2.amazonaws.com/rentdaddy/frontend:prod
docker push YOURAWSACCOUNTID.dkr.ecr.us-east-2.amazonaws.com/rentdaddy/frontend:prod
```

### Postgres Image

```sh
cd /path/to/RentDaddy/docker/postgres
docker build -t rentdaddy-main:postgres-15-amd64 -f Dockerfile.prod .
docker tag rentdaddy-main:postgres-15-amd64 YOURAWSACCOUNTID.dkr.ecr.us-east-2.amazonaws.com/rentdaddy-main:postgres-15-amd64
docker push YOURAWSACCOUNTID.dkr.ecr.us-east-2.amazonaws.com/rentdaddy-main:postgres-15-amd64
```

<!-- Documenso Worker section removed as it's no longer needed -->

Remember to replace `YOURAWSACCOUNTID` with your actual AWS account ID in all commands.

## Step 3: Generate a Document Signing Certificate

The Documenso service requires a PKCS#12 (.p12) certificate for document signing. You need to generate this certificate and copy it to the EC2 instances later.

```sh
cd /path/to/RentDaddy
openssl req -x509 -newkey rsa:4096 -keyout private.key -out certificate.crt -days 3650 -nodes -subj "/CN=RentDaddy Document Signing"
openssl pkcs12 -export -out cert.p12 -inkey private.key -in certificate.crt -passout pass:teamezraapp
```

This creates a `cert.p12` file with the password "teamezraapp" (as configured in the Terraform secrets).

## Step 4: Configure Terraform

Navigate to the Terraform directory:

```sh
cd /path/to/RentDaddy/deployment/simplified_terraform
```

Copy the example Terraform variables file and edit it:

```sh
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your specific values:

```sh
# Required variables - must be set
aws_account_id        = "123456789012"  # Your 12-digit AWS account ID
domain_name           = "yourdomain.com"  # Your domain name
route53_zone_id       = "Z1234567890ABCDEFGHIJ"  # Your Route53 zone ID
backend_secret_arn    = "arn:aws:secretsmanager:us-east-2:123456789012:secret:rentdaddy/production/main-app"
documenso_secret_arn  = "arn:aws:secretsmanager:us-east-2:123456789012:secret:rentdaddy/production/documenso"
deploy_version        = "1.0.0"  # Increment this value to force redeployment

# Optional variables - defaults will be used if not specified
aws_region            = "us-east-2"  # Change if you wish to deploy to a different region
app_subdomain         = "app"  # Customize as needed
api_subdomain         = "api"  # Customize as needed
docs_subdomain        = "docs"  # Customize as needed
ec2_key_pair_name     = "rentdaddy_key"  # The key pair name you created
ecs_instance_size     = "t3.xlarge"  # EC2 instance type for ECS instances
debug_mode            = "false"  # Set to "true" for troubleshooting
```

## Step 5: Apply Terraform Configuration

Initialize Terraform:

```sh
terraform init
```

Plan the deployment:

```sh
terraform plan
```

Apply the configuration:

```sh
terraform apply
```

Review the plan and type "yes" to confirm. Deployment may take 15-20 minutes to complete.

## Step 6: Copy the Certificate to EC2 Instances

After the Terraform deployment completes, you need to copy the document signing certificate to both EC2 instances:

```sh
# Get EC2 instance IDs
INSTANCE_IDS=$(terraform output -json instance_ids | jq -r '.[]')

for INSTANCE_ID in $INSTANCE_IDS; do
  # Copy certificate to each instance using AWS SSM
  aws ec2-instance-connect send-ssh-public-key \
    --instance-id $INSTANCE_ID \
    --availability-zone "us-east-2a" \
    --instance-os-user ec2-user \
    --ssh-public-key file://~/.ssh/id_rsa.pub
    
  scp -i rentdaddy_key.pem cert.p12 ec2-user@$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query "Reservations[0].Instances[0].PublicIpAddress" --output text):/home/ec2-user/documenso/
done
```

## Step 7: Link Certificate to Documenso Volume

SSH into each instance and properly link the certificate:

```sh
for INSTANCE_ID in $INSTANCE_IDS; do
  INSTANCE_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query "Reservations[0].Instances[0].PublicIpAddress" --output text)
  
  ssh -i rentdaddy_key.pem ec2-user@$INSTANCE_IP "sudo docker volume ls | grep documenso-cert && \
  sudo docker run --rm -v documenso-cert:/data -v /home/ec2-user/documenso:/source alpine cp /source/cert.p12 /data/"
done
```

## Step 8: Configure DNS

Terraform will create all necessary Route53 records for your domain. Ensure your domain's nameservers are properly set with your registrar to point to the AWS Route53 nameservers.

You can get the nameservers from:

```sh
terraform output nameservers
```

## Step 9: Set Up Clerk Authentication

1. Create an account at [Clerk.dev](https://clerk.dev/)
2. Set up an application and configure your domain
3. Update the Secrets Manager entries with your Clerk credentials
4. Add the necessary DNS records for Clerk (these will vary based on your Clerk configuration)

## Step 10: Verify Deployment

After deployment completes and DNS propagates (which may take up to 48 hours), verify your deployment by accessing:

- Main application: `https://app.yourdomain.com`
- API: `https://api.yourdomain.com/healthz`
- Documenso: `https://docs.yourdomain.com`

## Troubleshooting

### Check ECS Service Status

```sh
aws ecs describe-services --cluster rentdaddy-cluster --services rentdaddy-app-service rentdaddy-documenso-service
```

### View Container Logs

```sh
aws logs get-log-events --log-group-name /ecs/rentdaddy-backend --log-stream-name backend/backend/<ID>
aws logs get-log-events --log-group-name /ecs/rentdaddy-frontend --log-stream-name frontend/frontend/<ID>
aws logs get-log-events --log-group-name /ecs/rentdaddy-documenso --log-stream-name documenso/documenso/<ID>
```

### SSH to EC2 Instances

```sh
ssh -i rentdaddy_key.pem ec2-user@<EC2_INSTANCE_IP>
```

### View Docker Containers

```sh
docker ps
docker logs <CONTAINER_ID>
```

## Maintenance and Updates

### Updating Container Images

When you need to update your application:

1. Build and push new container images with the `:latest` tag
2. Increment the `deploy_version` variable in `terraform.tfvars`
3. Run `terraform apply` to deploy the changes

### Managing AWS Costs

Monitor your AWS costs regularly. The main costs for this deployment come from:

- EC2 instances (2 x t3.xlarge)
- Elastic Load Balancer
- S3 bucket storage
- CloudWatch Logs

Consider using Reserved Instances for EC2 if you plan to run the application for a year or more.

### Backups

The application data is stored in Docker volumes on EC2 instances. For production systems, consider:

1. Setting up regular EBS snapshots
2. Configuring database backups to S3
3. Implementing a disaster recovery plan

## Cleaning Up

To remove all AWS resources created by this deployment:

```sh
terraform destroy
```

**Warning**: This will delete all resources, including databases and stored data. Make sure to back up any important data before running this command.