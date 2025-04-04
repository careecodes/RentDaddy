#!/bin/bash
set -e

# Log function for better output
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to load environment variables from a file
load_env() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    log "Loading environment variables from $env_file"
    set -a # automatically export all variables
    source "$env_file"
    set +a
  else
    log "Warning: Environment file $env_file not found!"
    return 1
  fi
}

# Navigate to the project root
PROJECT_ROOT="/Users/reemmokhtar/Library/CloudStorage/OneDrive-Personal/Documents/DevOps/CYC_Prototype_Apartment/RentDaddy_Production/RentDaddy"
cd "$PROJECT_ROOT"

# Load environment variables
load_env "$PROJECT_ROOT/backend/.env.production.local"

# Set default pattern
FILTER_PATTERN=${1:-"documenso-worker"}

log "Monitoring Documenso worker logs with filter pattern: '$FILTER_PATTERN'"
log "Press Ctrl+C to exit"

# Stream logs from CloudWatch
aws logs tail "/ecs/rentdaddy-documenso" --filter-pattern "$FILTER_PATTERN" --follow