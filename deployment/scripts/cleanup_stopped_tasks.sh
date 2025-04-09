#!/bin/bash
set -e

# Log function for better output
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# ECS cluster name
CLUSTER="rentdaddy-cluster"

log "Starting cleanup of stopped ECS tasks in cluster: $CLUSTER"

# Get list of stopped tasks
STOPPED_TASKS=$(aws ecs list-tasks \
  --cluster $CLUSTER \
  --desired-status STOPPED \
  --output text \
  --query 'taskArns[*]')

if [ -z "$STOPPED_TASKS" ]; then
  log "No stopped tasks found in cluster $CLUSTER"
  exit 0
fi

# Count the number of tasks
TASK_COUNT=$(echo "$STOPPED_TASKS" | wc -w | tr -d ' ')
log "Found $TASK_COUNT stopped task(s)"

# Get details about the stopped tasks
log "Getting details about stopped tasks..."
TASK_DETAILS=$(aws ecs describe-tasks \
  --cluster $CLUSTER \
  --tasks $STOPPED_TASKS \
  --query 'tasks[*].[taskArn,lastStatus,stoppedReason]' \
  --output text)

# Display task details and prepare for cleanup
echo "Stopped tasks:"
echo "-------------------------------"
echo "$TASK_DETAILS" | while read -r TASK_ARN STATUS REASON; do
  echo "Task: $TASK_ARN"
  echo "Status: $STATUS"
  echo "Reason: $REASON"
  echo "-------------------------------"
done

# Since we can't directly delete stopped tasks, we can:
# 1. Record their information (done above)
# 2. Wait for ECS to clean them up automatically (they expire after about 24 hours)
# 3. Provide instructions for manual intervention if needed

log "Note: Stopped tasks will be automatically cleaned up by ECS after approximately 24 hours"
log "If you need to immediately free up resources, consider:"
log "1. Deregistering task definitions that are no longer needed"
log "2. Scaling down services that have too many stopped tasks"
log "3. Restarting the ECS service if appropriate"

log "Task listing completed"