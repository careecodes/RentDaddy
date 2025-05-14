# RentDaddy Scripts Reference

This document provides a comprehensive overview of all scripts available in the RentDaddy project, organized by category and location.

## Recent Script Improvements

Several scripts have been recently improved:

1. **Fixed Issues**:
   - Fixed `cleanup_stopped_tasks.sh` to correctly handle already-stopped tasks
   - Fixed timestamp handling in `cleanup_older_logstreams.sh`
   - Added AWS CLI version compatibility check in `monitor_documenso_worker.sh`

2. **New Utility Library**:
   - Created `utils.sh` with shared functions for deployment scripts
   - Updated `build_and_deploy_latest.sh` to use the utility library
   - Added dynamic worker directory detection

3. **Enhanced Documentation**:
   - Added detailed README files for both backend and deployment scripts
   - Created this script reference document

## Deployment Scripts (`/deployment/scripts/`)

### Build and Deployment

| Script | Description | Usage |
|--------|-------------|-------|
| `build_and_deploy_latest.sh` | Build and deploy Docker images to ECR | `./build_and_deploy_latest.sh [--backend] [--frontend] [--worker] [--all] [--deploy] [--tag TAG]` |
| `apply_terraform.sh` | Apply Terraform configuration | `./apply_terraform.sh [--debug] [--auto-approve]` |
| `force_new_deployment_all.sh` | Force new deployment of all ECS services | `./force_new_deployment_all.sh` |

### Monitoring and Management

| Script | Description | Usage |
|--------|-------------|-------|
| `monitor_documenso_worker.sh` | Monitor Documenso worker logs | `./monitor_documenso_worker.sh [FILTER_PATTERN]` |
| `describe_services.sh` | Describe ECS services status | `./describe_services.sh` |
| `latest_logs.sh` | Get latest CloudWatch logs | `./latest_logs.sh [--limit NUMBER]` |

### Cleanup and Maintenance

| Script | Description | Usage |
|--------|-------------|-------|
| `cleanup_older_logstreams.sh` | Clean up old CloudWatch log streams | `./cleanup_older_logstreams.sh [--days NUMBER]` |
| `cleanup_stopped_tasks.sh` | Clean up stopped ECS tasks | `./cleanup_stopped_tasks.sh` |

### Data Management

| Script | Description | Usage |
|--------|-------------|-------|
| `deploy-seed-users.sh` | Deploy seed users to production | `./deploy-seed-users.sh [--with-clerk]` |
| `run-seed-users-in-container.sh` | Run seed users in container | `./run-seed-users-in-container.sh [--with-clerk]` |
| `secrets_manager_main.py` | Manage AWS Secrets Manager | `python secrets_manager_main.py --backend-env PATH --frontend-env PATH` |

### Testing

| Script | Description | Usage |
|--------|-------------|-------|
| `test_documenso_webhooks.sh` | Test Documenso webhooks | `./test_documenso_webhooks.sh` |

### Utilities

| Script | Description | Usage |
|--------|-------------|-------|
| `utils.sh` | Shared utility functions | `source "$(dirname "$0")/utils.sh"` |

## Backend Scripts (`/backend/scripts/`)

### Building and Running

| Script | Description | Usage |
|--------|-------------|-------|
| `build-seed-users.sh` | Build seed users binary | `./build-seed-users.sh [--with-clerk]` |
| `run-seed-users.sh` | Run seed users script | `./run-seed-users.sh [--with-clerk]` |
| `generate-cron-token.sh` | Generate cron job token | `./generate-cron-token.sh` |
| `simulate-cron.sh` | Simulate cron job execution | `./simulate-cron.sh` |

### Testing

| Script | Description | Usage |
|--------|-------------|-------|
| `test-all.sh` | Run all tests | `./test-all.sh` |
| `test-changed.sh` | Test changed files only | `./test-changed.sh` |
| `test-lease-notify.sh` | Test lease notifications | `./test-lease-notify.sh` |
| `lease-seed-database.sh` | Seed database with lease data | `./lease-seed-database.sh` |
| `lease-status-test.sh` | Test lease status transitions | `./lease-status-test.sh` |

## Command Directories (`/backend/scripts/cmd/`)

| Directory | Description |
|-----------|-------------|
| `cmd/complaintswork/` | Generate complaints and work order test data |
| `cmd/cron/` | Cron job configuration files |
| `cmd/seed_users_data/` | Basic seed user data |
| `cmd/seed_users_with_clerk/` | Seed users with Clerk authentication |

## Main Project Scripts (`/scripts/`)

| Script | Description | Usage |
|--------|-------------|-------|
| `setup.sh` | Initial project setup | `./setup.sh` |
| `setup-local-documenso.sh` | Set up local Documenso instance | `./setup-local-documenso.sh` |
| `test-production.sh` | Test production builds locally | `./test-production.sh [--clean] [--rebuild] [--log] [--symlinks]` |

The `test-production.sh` script is particularly useful for validating production container changes locally before deploying to AWS. It includes a special `--symlinks` option to quickly test just the symlink functionality without a full build.

Examples:
```bash
# Quick test of just the symlink functionality
./scripts/test-production.sh --symlinks

# Full build and logs
./scripts/test-production.sh --rebuild --log

# Clean environment and rebuild
./scripts/test-production.sh --clean --rebuild
```

## Best Practices for Script Development

1. **Consistency**:
   - Use the utilities in `utils.sh` for common functions
   - Follow the standard argument parsing pattern
   - Use standard error handling

2. **Path Independence**:
   - Use `find_project_root()` to locate project directories
   - Don't hardcode absolute paths
   - Check all required resources exist

3. **Error Handling**:
   - Use `set -e` to fail on error
   - Check command exit status
   - Provide clear error messages
   - Clean up temporary resources

4. **Documentation**:
   - Add a descriptive header with usage instructions
   - Document arguments and options
   - Include examples of common use cases

5. **Cross-Platform**:
   - Test on both macOS and Linux
   - Use conditional logic for OS-specific commands
   - Check for required tools and provide feedback

6. **Local Testing**:
   - Test production builds locally before pushing to ECR
   - Isolate specific functionality to test (like symlinks) for quicker iteration
   - Use architecture-specific builds for faster testing