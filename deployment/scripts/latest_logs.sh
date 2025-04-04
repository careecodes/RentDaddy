#!/bin/bash

# ECS log groups
LOG_GROUPS=(
  "/ecs/rentdaddy-backend"
  "/ecs/rentdaddy-frontend"
  "/ecs/rentdaddy-documenso"
)

LIMIT=2
LOG_DIR="../simplified_terraform/ecs_logs_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$LOG_DIR"

for GROUP in "${LOG_GROUPS[@]}"; do
  echo "🔍 Log group: $GROUP"

  # Get latest 5 log streams (e.g., backend, frontend, postgres)
  STREAMS=$(aws logs describe-log-streams \
    --log-group-name "$GROUP" \
    --order-by LastEventTime \
    --descending \
    --limit 3 \
    --query "logStreams[*].logStreamName" \
    --output text)

  for STREAM in $STREAMS; do
    SAFE_STREAM_NAME=$(echo "$STREAM" | tr '/:' '_')
    LOG_FILE="${LOG_DIR}/${SAFE_STREAM_NAME}.log"

    echo "📄 Writing logs from stream: $STREAM → $LOG_FILE"

    aws logs get-log-events \
      --log-group-name "$GROUP" \
      --log-stream-name "$STREAM" \
      --limit $LIMIT \
      --query "events[*].[timestamp, message]" \
      --output text > "$LOG_FILE"
  done

  echo
done

echo "✅ Done. Logs saved to: $LOG_DIR"
