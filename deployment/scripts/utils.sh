#!/bin/bash
#
# Common utility functions for RentDaddy scripts
# Include this in other scripts with: source "$(dirname "$0")/utils.sh"
#

# Standard log function for consistent output
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to find project root (works from any subdirectory)
find_project_root() {
  # Try to use git to find the repository root
  if git rev-parse --show-toplevel &> /dev/null; then
    git rev-parse --show-toplevel
  else
    # Fallback if not in a git repository
    local current_dir="$(pwd)"
    # Navigate up until we find a directory that looks like the project root
    while [[ "$current_dir" != "/" ]]; do
      if [[ -d "$current_dir/backend" && -d "$current_dir/frontend" ]]; then
        echo "$current_dir"
        return 0
      fi
      current_dir="$(dirname "$current_dir")"
    done
    # Last resort fallback
    echo "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  fi
}

# Function to load environment variables from a file
load_env() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    log "Loading environment variables from $env_file"
    set -a # automatically export all variables
    
    # Use grep to filter out empty lines and comments
    while IFS= read -r line; do
      # Skip comments and empty lines
      [[ "$line" =~ ^[[:space:]]*# || -z "$line" ]] && continue
      
      # Extract key and value (handle quoted values correctly)
      if [[ "$line" =~ ^[[:space:]]*([A-Za-z0-9_]+)[[:space:]]*=[[:space:]]*(.*) ]]; then
        local key="${BASH_REMATCH[1]}"
        local raw_value="${BASH_REMATCH[2]}"
        
        # Remove quotes if present
        if [[ "$raw_value" =~ ^\"(.*)\"$ || "$raw_value" =~ ^\'(.*)\'$ ]]; then
          value="${BASH_REMATCH[1]}"
        else
          value="$raw_value"
        fi
        
        # Export the variable
        log "Setting $key=${value:0:3}..."
        export "$key=$value"
      else
        # If line doesn't match pattern, try exporting it directly (legacy support)
        log "Direct export: ${line:0:10}..."
        export "$line"
      fi
    done < "$env_file"
    
    set +a
    return 0
  else
    log "Warning: Environment file $env_file not found at path: $(realpath "$env_file" 2>/dev/null || echo "$env_file")"
    return 1
  fi
}

# Function to authenticate with AWS ECR
ecr_login() {
  if [ -z "$AWS_ACCOUNT_ID" ] || [ -z "$AWS_REGION" ]; then
    log "Error: AWS_ACCOUNT_ID and AWS_REGION must be set for ECR login"
    return 1
  fi
  
  log "Logging in to Amazon ECR in region $AWS_REGION..."
  aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
  return $?
}

# Load AWS credentials and configuration for deployment
load_aws_config() {
  local PROJECT_ROOT="$1"
  if [ -z "$PROJECT_ROOT" ]; then
    PROJECT_ROOT=$(find_project_root)
  fi
  
  # Remove any potential trailing newlines from PROJECT_ROOT
  PROJECT_ROOT=$(echo "$PROJECT_ROOT" | tr -d '\n')
  
  log "Looking for AWS credentials in project root: $PROJECT_ROOT"
  # Check that PROJECT_ROOT exists and is a directory
  if [ ! -d "$PROJECT_ROOT" ]; then
    log "ERROR: Project root does not exist or is not a directory: $PROJECT_ROOT"
    # Continue anyway since we can still use AWS CLI credentials
  fi
  
  # Search for available environment files more thoroughly
  local backend_env="$PROJECT_ROOT/backend/.env.production.local"
  local frontend_env="$PROJECT_ROOT/frontend/app/.env.production.local"
  
  log "Checking for backend env file: $backend_env"
  if [ -f "$backend_env" ]; then
    log "Found backend env file, loading..."
    load_env "$backend_env"
    
    # Verify required AWS variables are loaded
    if [ -z "$AWS_ACCOUNT_ID" ] || [ -z "$AWS_REGION" ]; then
      log "Error: AWS_ACCOUNT_ID and AWS_REGION must be set in environment"
      return 1
    fi
    return 0
  fi
  
  log "Checking for frontend env file: $frontend_env"
  if [ -f "$frontend_env" ]; then
    log "Found frontend env file, loading..."
    load_env "$frontend_env"
    
    # Verify required AWS variables are loaded
    if [ -z "$AWS_ACCOUNT_ID" ] || [ -z "$AWS_REGION" ]; then
      log "Error: AWS_ACCOUNT_ID and AWS_REGION must be set in environment"
      return 1
    fi
    return 0
  fi
  
  log "Warning: No production environment files found for AWS credentials."
  log "Make sure AWS credentials are configured through one of these methods:"
  log "1. .env.production.local file in backend/ or frontend/app/ directories"
  log "2. Environment variables AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
  log "3. AWS CLI configuration in ~/.aws/credentials"
  
  # Check if ~/.aws/credentials exists
  if [ -f "$HOME/.aws/credentials" ]; then
    log "Found AWS CLI credentials at ~/.aws/credentials, will attempt to use these"
    return 0
  else
    return 1
  fi
}

# The check_documenso_webhook_status function has been removed
# The documenso-worker component has been eliminated from the architecture
# Webhook functionality is now handled directly by the backend

# Get current terraform variables
get_terraform_var() {
  local var_name="$1"
  local terraform_dir="$2"
  local PROJECT_ROOT="$3"
  
  if [ -z "$PROJECT_ROOT" ]; then
    PROJECT_ROOT=$(find_project_root)
  fi
  
  if [ -z "$terraform_dir" ]; then
    terraform_dir="$PROJECT_ROOT/deployment/simplified_terraform"
  fi
  
  if [ ! -f "$terraform_dir/terraform.tfvars" ]; then
    return 1
  fi
  
  # Extract variable value using grep and sed
  grep "^$var_name *=" "$terraform_dir/terraform.tfvars" | sed -E "s/^$var_name *=[ \"]*([^\"]*)[\"]*.*$/\1/" | tr -d " "
}

# Function to verify script requirements and exit if not met
verify_requirements() {
  local requirements=("$@")
  local missing=false
  
  for cmd in "${requirements[@]}"; do
    if ! command -v "$cmd" &> /dev/null; then
      log "Error: Required command '$cmd' not found"
      missing=true
    fi
  done
  
  if [ "$missing" = true ]; then
    log "Please install the missing requirements and try again"
    exit 1
  fi
}

# Print banner for script start
print_banner() {
  local title="$1"
  local width=80
  local line=""
  
  # Create separator line
  for ((i=0; i<width; i++)); do
    line="${line}="
  done
  
  echo ""
  echo "$line"
  echo "  ${title}"
  echo "$line"
  echo ""
}

# Initialize script with standard setup
# NOTE: This function does NOT return the project root!
# You should use a separate call to find_project_root() for that.
# Example:
#   PROJECT_ROOT=$(find_project_root)
#   init_script "My Script Name" aws docker
init_script() {
  local script_name="$1"
  shift
  
  # Set strict mode 
  set -e
  trap 'log "Error on line $LINENO"' ERR
  
  # Print banner
  print_banner "$script_name"
  
  # Verify requirements
  verify_requirements "$@"
  
  # This function does not return anything, it only initializes the script environment
}

# Export variables and functions
export -f log
export -f find_project_root
export -f load_env
export -f ecr_login
export -f load_aws_config
export -f get_terraform_var
export -f verify_requirements
export -f print_banner
export -f init_script