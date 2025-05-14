#!/bin/bash
set -e

# Log function for better output
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Display formatted date for either macOS or Linux
format_date() {
  local timestamp="$1"  # Timestamp in seconds
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS date command
    date -r "$timestamp" "+%Y-%m-%d %H:%M:%S"
  else
    # Linux date command
    date -d "@$timestamp" "+%Y-%m-%d %H:%M:%S"
  fi
}

# Parse command line arguments
DAYS_TO_KEEP=1  # Default to keep 1 day of logs
while [[ $# -gt 0 ]]; do
  case "$1" in
    --days|-d)
      DAYS_TO_KEEP="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--days NUMBER]"
      exit 1
      ;;
  esac
done

# Set log groups to clean
LOG_GROUPS=(
  "/ecs/rentdaddy-backend"
  "/ecs/rentdaddy-frontend"
  "/ecs/rentdaddy-documenso"
)

# Get cutoff timestamp (macOS/Linux compatible)
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS date command
  CUTOFF=$(date -v-${DAYS_TO_KEEP}d +%s)
else
  # Linux date command
  CUTOFF=$(date --date="${DAYS_TO_KEEP} days ago" +%s)
fi

# Convert to milliseconds for AWS API
CUTOFF_MS=$((CUTOFF * 1000))

log "Cleaning log streams older than ${DAYS_TO_KEEP} day(s) (before $(format_date $CUTOFF))"

for LOG_GROUP in "${LOG_GROUPS[@]}"; do
  log "Checking log group: $LOG_GROUP"

  # Get old log streams
  OLD_STREAMS=$(aws logs describe-log-streams \
    --log-group-name "$LOG_GROUP" \
    --order-by LastEventTime \
    --descending \
    --query "logStreams[?lastEventTimestamp < \`$CUTOFF_MS\`].logStreamName" \
    --output text)

  if [[ -z "$OLD_STREAMS" || "$OLD_STREAMS" == "None" ]]; then
    log "No old log streams to delete in $LOG_GROUP"
  else
    COUNT=0
    for STREAM in $OLD_STREAMS; do
      log "Deleting: $STREAM"
      if aws logs delete-log-stream --log-group-name "$LOG_GROUP" --log-stream-name "$STREAM"; then
        COUNT=$((COUNT+1))
      else
        log "Failed to delete stream: $STREAM"
      fi
    done
    log "Deleted $COUNT log streams from $LOG_GROUP"
  fi
done

log "Log cleanup completed"