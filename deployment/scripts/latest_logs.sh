#!/bin/bash

# Load utility functions
source "$(dirname "$0")/utils.sh"

# Parse command line arguments
LIMIT=20  # Default to more lines
while [[ $# -gt 0 ]]; do
  case "$1" in
    --limit|-l)
      LIMIT="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--limit NUMBER]"
      exit 1
      ;;
  esac
done

# Initialize
PROJECT_ROOT=$(find_project_root)
init_script "RentDaddy Log Retrieval" aws

# Load AWS configuration
load_aws_config "$PROJECT_ROOT"

# Set up log directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="$PROJECT_ROOT/deployment/simplified_terraform/ecs_logs_$TIMESTAMP"

# ECS log groups
LOG_GROUPS=(
  "/ecs/rentdaddy-backend"
  "/ecs/rentdaddy-frontend"
  "/ecs/rentdaddy-documenso"
)

# Create directory for logs
mkdir -p "$LOG_DIR"
log "Created log directory: $LOG_DIR"

for GROUP in "${LOG_GROUPS[@]}"; do
  log "Retrieving logs from group: $GROUP"

  # Get latest log streams (e.g., backend, frontend, postgres)
  STREAMS=$(aws logs describe-log-streams \
    --log-group-name "$GROUP" \
    --order-by LastEventTime \
    --descending \
    --limit 3 \
    --query "logStreams[*].logStreamName" \
    --output text)

  if [ -z "$STREAMS" ]; then
    log "No log streams found for $GROUP"
    continue
  fi

  for STREAM in $STREAMS; do
    SAFE_STREAM_NAME=$(echo "$STREAM" | tr '/:' '_')
    LOG_FILE="${LOG_DIR}/${SAFE_STREAM_NAME}.log"

    log "Retrieving logs from stream: $STREAM -> $LOG_FILE"

    # Get log events
    aws logs get-log-events \
      --log-group-name "$GROUP" \
      --log-stream-name "$STREAM" \
      --limit $LIMIT \
      --query "events[*].[timestamp, message]" \
      --output text > "$LOG_FILE"

    if [ $? -eq 0 ]; then
      log "Logs saved to $LOG_FILE"
      # Display the first few lines
      echo "--- First few lines of $LOG_FILE ---"
      head -n 5 "$LOG_FILE"
      echo "-----------------------------------"
    else
      log "Failed to retrieve logs for stream: $STREAM"
    fi
  done
done

log "✅ Log retrieval complete. All logs saved to: $LOG_DIR"