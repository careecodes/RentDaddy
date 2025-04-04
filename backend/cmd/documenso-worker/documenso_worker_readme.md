# Documenso Worker Implementation

This document provides an overview of the custom documenso-worker implementation that replaces the Inngest worker job system in production.

## Problem

The Documenso webhook system relies on background jobs processed by Inngest, which doesn't work properly in the production environment. As a result, webhook events for document status changes are not being delivered to our backend.

## Solution

We've implemented a custom Go-based worker that directly polls the Documenso PostgreSQL database for:
1. Pending jobs in the `BackgroundJob` table
2. Completed documents that need webhook notifications

When it finds relevant events, it forwards them to our backend webhook endpoint, simulating the webhook delivery that should have come from Inngest.

## Implementation Details

1. **Worker Code**: `/backend/cmd/documenso-worker/main.go`
   - Polls the Documenso database every 15 seconds (configurable)
   - Handles different database schema versions
   - Forwards webhook payloads to the specified endpoint
   - Includes error handling and retry logic

2. **Dockerfile**: `/backend/cmd/documenso-worker/Dockerfile`
   - Multi-stage build for a minimal production image
   - Based on Go 1.23-alpine
   - Results in a lightweight container

3. **Task Definition**: Updated in `/deployment/simplified_terraform/main.tf`
   - Added worker container definition to the Documenso service
   - Configured with appropriate environment variables and secrets
   - Set up logging to CloudWatch

4. **Build Script**: Enhanced `/deployment/scripts/build_and_deploy_latest.sh`
   - Added `build_worker` function to build and push the worker container
   - Can be invoked with `--worker` flag

## Deployment Steps

1. **Build the worker**:
   ```bash
   ./deployment/scripts/build_and_deploy_latest.sh --worker
   ```

2. **Apply Terraform changes**:
   ```bash
   ./deployment/scripts/apply_terraform.sh
   ```

3. **Monitor the deployment**:
   ```bash
   aws ecs describe-services --cluster rentdaddy-cluster --services rentdaddy-documenso-service
   ```

4. **Watch worker logs**:
   ```bash
   ./deployment/scripts/monitor_documenso_worker.sh
   ```

## Testing Plan

Run the test plan:
```bash
./deployment/scripts/test_documenso_webhooks.sh
```

This will guide you through:
1. Sending a test lease agreement
2. Signing the agreement to trigger webhooks
3. Verifying that statuses update correctly
4. Troubleshooting if needed

## Fallback Options

If issues persist, try:
1. Different Documenso image versions
2. Check WebhookDelivery or Document tables for different schemas
3. Adjust database polling frequency

## Maintenance

The worker is designed to be low-maintenance and self-healing:
- Automatically reconnects if database connection is lost
- Retries failed webhook deliveries
- Logs activity for monitoring and debugging