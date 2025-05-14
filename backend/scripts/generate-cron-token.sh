#!/bin/bash
set -e

# Log function for better output
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to find project root
find_project_root() {
  # Try to use git to find the repository root
  if git rev-parse --show-toplevel &> /dev/null; then
    git rev-parse --show-toplevel
  else
    # Fallback if not in a git repository
    local current_dir="$(pwd)"
    while [[ "$current_dir" != "/" ]]; do
      if [[ -d "$current_dir/backend" && -d "$current_dir/frontend" ]]; then
        echo "$current_dir"
        return 0
      fi
      current_dir="$(dirname "$current_dir")"
    done
    # If we can't determine the project root, use the script's parent directory
    echo "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  fi
}

# Find the project root
PROJECT_ROOT=$(find_project_root)
log "Project root directory: $PROJECT_ROOT"

# Generate a secure random token - 32 characters, URL-safe
generate_token() {
  # Check what tools are available and use the most secure option
  if command -v openssl >/dev/null 2>&1; then
    # Generate using OpenSSL (most secure)
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32
  elif command -v dd >/dev/null 2>&1 && [ -f /dev/urandom ]; then
    # Use /dev/urandom as fallback
    dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64 | tr -dc 'a-zA-Z0-9' | head -c 32
  else
    # Basic fallback using bash, less secure but better than nothing
    # Use current time, process ID, hostname, and random number
    echo "Warning: Using less secure token generation method. Install OpenSSL for better security." >&2
    date +%s%N$RANDOM$HOSTNAME$$ | sha256sum | head -c 32
  fi
}

# Generate the token
TOKEN=$(generate_token)
log "Generated secure CRON_SECRET_TOKEN"

# Function to update env file with the token
update_env_file() {
  local env_file="$1"
  
  if [ ! -f "$env_file" ]; then
    log "File $env_file doesn't exist, creating it"
    touch "$env_file"
  fi
  
  # Check if CRON_SECRET_TOKEN already exists in the file
  if grep -q "^CRON_SECRET_TOKEN=" "$env_file"; then
    # Replace existing token
    sed -i.bak "s/^CRON_SECRET_TOKEN=.*$/CRON_SECRET_TOKEN=$TOKEN/" "$env_file"
    rm -f "${env_file}.bak"  # Remove backup file
    log "Updated existing CRON_SECRET_TOKEN in $env_file"
  else
    # Add token to the end of the file with a comment
    echo "" >> "$env_file"
    echo "# Secure token for cron job authentication" >> "$env_file"
    echo "CRON_SECRET_TOKEN=$TOKEN" >> "$env_file"
    log "Added CRON_SECRET_TOKEN to $env_file"
  fi
}

# Update all relevant environment files
for ENV_TYPE in development production; do
  # Try to update both regular and .local env files
  update_env_file "$PROJECT_ROOT/backend/.env.${ENV_TYPE}"
  update_env_file "$PROJECT_ROOT/backend/.env.${ENV_TYPE}.local"
done

log "CRON_SECRET_TOKEN has been generated and saved to environment files."
log "This token provides secure access to cron job endpoints."
log ""
log "The token is: $TOKEN"
log ""
log "Include this token in your cron job calls as:"
log "  curl -X GET \${DOMAIN_URL}:\${PORT}/cron/leases/expire -H \"Authorization: Bearer \${CRON_SECRET_TOKEN}\""