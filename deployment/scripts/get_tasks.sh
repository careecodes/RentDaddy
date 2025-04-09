#\!/bin/bash
source "$(dirname "$0")/utils.sh"
PROJECT_ROOT=$(find_project_root)
log "Getting running tasks..."
aws ecs list-tasks --cluster rentdaddy-cluster > "$PROJECT_ROOT/deployment/simplified_terraform/task_list.json"
TASKS=$(aws ecs list-tasks --cluster rentdaddy-cluster --output text --query taskArns)
if [ -n "$TASKS" ]; then
  log "Describing tasks..."
  aws ecs describe-tasks --cluster rentdaddy-cluster --tasks $TASKS > "$PROJECT_ROOT/deployment/simplified_terraform/task_details.json"
fi
log "Tasks saved to $PROJECT_ROOT/deployment/simplified_terraform/"
