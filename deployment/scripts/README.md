# RentDaddy Deployment Scripts

This directory contains scripts for building, deploying, and managing the RentDaddy application on AWS.

## Utility Scripts

### utils.sh
Shared utility functions used by other scripts. Include in your scripts with:
```bash
source "$(dirname "$0")/utils.sh"
```

Key functions:
- `log()` - Consistent logging with timestamps
- `find_project_root()` - Find the project root directory
- `load_env()` - Load environment variables from a file
- `load_aws_config()` - Load AWS credentials and configuration
- `ecr_login()` - Authenticate with AWS ECR
- `get_terraform_var()` - Get a variable value from terraform.tfvars
- `verify_requirements()` - Check for required commands
- `print_banner()` - Print a stylized banner for script start
- `init_script()` - Initialize a script with standard setup

#### Script Best Practices

When creating or updating scripts:

1. Always include utils.sh at the top of your script:
   ```bash
   #!/bin/bash
   source "$(dirname "$0")/utils.sh"
   ```

2. Initialize your script properly with required tools:
   ```bash
   # Get project root and initialize script with required tools
   PROJECT_ROOT=$(find_project_root)
   init_script "My Script Name" aws docker terraform
   ```

3. Load AWS configuration if needed:
   ```bash
   # Load AWS credentials and configuration
   load_aws_config "$PROJECT_ROOT"
   ```

4. Use consistent variable naming:
   - Use UPPER_CASE for global variables
   - Use lower_case for local variables inside functions

5. Always add error handling and verification:
   ```bash
   if [ $? -ne 0 ]; then
     log "Error: Failed to execute command"
     exit 1
   fi
   ```

## Build and Deployment Scripts

### build_and_deploy_latest.sh
Build and deploy Docker images to ECR and optionally force ECS deployment.

Usage:
```bash
./build_and_deploy_latest.sh [OPTIONS]
```

Options:
- `--backend` - Build backend only
- `--frontend` - Build frontend only
- `--all` - Build all images (default)
- `--deploy` - Force new deployment after building
- `--tag TAG` - Specify a custom tag (default: latest/prod)

### apply_terraform.sh
Apply Terraform configuration to update AWS resources.

Usage:
```bash
./apply_terraform.sh [--debug] [--auto-approve]
```

Options:
- `--debug` - Enable debug mode
- `--auto-approve` - Apply without confirmation

## AWS Management Scripts

### force_new_deployment_all.sh
Force a new deployment of all ECS services.

Usage:
```bash
./force_new_deployment_all.sh
```

<!-- Section removed as documenso-worker is no longer needed -->

### describe_services.sh
Describe the ECS services and their status.

Usage:
```bash
./describe_services.sh
```

### latest_logs.sh
Get the latest CloudWatch logs for services.

Usage:
```bash
./latest_logs.sh [--limit NUMBER]
```

### cleanup_older_logstreams.sh
Clean up older CloudWatch log streams.

Usage:
```bash
./cleanup_older_logstreams.sh
```

### cleanup_stopped_tasks.sh
Clean up stopped ECS tasks.

Usage:
```bash
./cleanup_stopped_tasks.sh
```

## Data Management Scripts

### deploy-seed-users.sh
Deploy and run seed users in the production environment.

Usage:
```bash
./deploy-seed-users.sh [--with-clerk]
```

Options:
- `--with-clerk` - Use Clerk authentication for seeded users

### run-seed-users-in-container.sh
Run seed users script in an already running container.

Usage:
```bash
./run-seed-users-in-container.sh [--with-clerk]
```

### secrets_manager_main.py
Manage AWS Secrets Manager with local environment files.

Usage:
```bash
python secrets_manager_main.py --backend-env PATH --frontend-env PATH [--secret-name NAME] [--secret-arn ARN] [--aws-region REGION]
```

## Testing Scripts

### test_documenso_webhooks.sh
Test Documenso webhook functionality directly with the backend.

Usage:
```bash
./test_documenso_webhooks.sh
```

## Script Organization

The scripts in this directory follow these naming conventions:
- `build_*.sh` - Scripts for building container images
- `deploy-*.sh` - Scripts for deployment to AWS
- `run-*.sh` - Scripts for running commands in containers
- `*_terraform.sh` - Scripts related to Terraform
- `monitor_*.sh` - Scripts for monitoring applications
- `cleanup_*.sh` - Scripts for cleaning up resources

## Recent Improvements

The following improvements have been made to the script ecosystem:

1. Created a shared utilities library (utils.sh) with common functions for:
   - Project root detection
   - Environment variable loading
   - AWS authentication
   - Error handling
   - Standardized logging

2. Updated all key scripts to use this utilities library:
   - describe_services.sh
   - apply_terraform.sh
   - force_new_deployment_all.sh
   - latest_logs.sh
   - test_documenso_webhooks.sh
   - build_and_deploy_latest.sh

3. Added best practices documentation for script development

4. Fixed issues in several scripts:
   - Fixed timestamp handling in cleanup_older_logstreams.sh for better cross-platform compatibility
   - Corrected logical issues in cleanup_stopped_tasks.sh
   - Removed documenso-worker references as it's no longer needed

## Prerequisites

Most scripts require the following tools:
- AWS CLI
- Docker
- Terraform (for Terraform-related scripts)
- Python 3 (for Python scripts)

Each script will check for its specific requirements and provide guidance if they're missing.