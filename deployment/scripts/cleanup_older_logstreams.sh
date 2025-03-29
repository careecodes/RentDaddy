#!/bin/bash

# Set log groups to clean
LOG_GROUPS=(
  "/ecs/rentdaddy-main_postgres"
  "/ecs/rentdaddy-documenso"
)

# Get 1 days ago (macOS-style)
CUTOFF=$(date -v-1d +%s)

for LOG_GROUP in "${LOG_GROUPS[@]}"; do
  echo "⏳ Checking log group: $LOG_GROUP"

  # Get old log streams
  OLD_STREAMS=$(aws logs describe-log-streams \
    --log-group-name "$LOG_GROUP" \
    --order-by LastEventTime \
    --descending \
    --query "logStreams[?lastEventTimestamp < \`${CUTOFF}000\`].logStreamName" \
    --output text)

  if [[ -z "$OLD_STREAMS" ]]; then
    echo "✅ No old log streams to delete in $LOG_GROUP"
  else
    for stream in $OLD_STREAMS; do
      echo "🗑️ Deleting: $stream"
      aws logs delete-log-stream --log-group-name "$LOG_GROUP" --log-stream-name "$stream"
    done
  fi

  echo
done
