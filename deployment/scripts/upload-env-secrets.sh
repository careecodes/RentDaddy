#!/bin/bash
# upload-env-secrets.sh - Script to upload environment variables to GitHub Environment

set -e

# Configuration
REPO_NAME="your-github-username/rentdaddy"  # Replace with your actual repository name
ENVIRONMENT="production"  # GitHub environment name
ENV_VARS_FILE="production/.env.vars"
SECRET_VARS_FILE="production/.env.secret.vars"

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) is not installed. Please install it first."
    echo "Visit: https://cli.github.com/manual/installation"
    exit 1
fi

# Check if logged in to GitHub CLI
if ! gh auth status &> /dev/null; then
    echo "You are not logged in to GitHub CLI. Please login first."
    echo "Run: gh auth login"
    exit 1
fi

# Check if the files exist
if [ ! -f "$ENV_VARS_FILE" ]; then
    echo "Error: $ENV_VARS_FILE does not exist."
    exit 1
fi

if [ ! -f "$SECRET_VARS_FILE" ]; then
    echo "Error: $SECRET_VARS_FILE does not exist."
    exit 1
fi

echo "Uploading environment variables and secrets to GitHub environment: $ENVIRONMENT"

# Function to upload variables
upload_env_vars() {
    local file=$1
    local is_secret=$2
    
    echo "Processing file: $file"
    
    # Read each line from the file
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip empty lines and comments
        if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
            continue
        fi
        
        # Extract variable name and value
        if [[ "$line" =~ ^([A-Za-z0-9_]+)=(.*)$ ]]; then
            name="${BASH_REMATCH[1]}"
            value="${BASH_REMATCH[2]}"
            
            # Remove quotes if present
            value="${value#\"}"
            value="${value%\"}"
            value="${value#\'}"
            value="${value%\'}"
            
            if [ "$is_secret" = true ]; then
                echo "Setting environment secret: $name"
                echo "$value" | gh secret set "$name" -e "$ENVIRONMENT" -R "$REPO_NAME"
            else
                echo "Setting environment variable: $name"
                echo "$value" | gh variable set "$name" -e "$ENVIRONMENT" -R "$REPO_NAME"
            fi
        fi
    done < "$file"
}

# Upload regular environment variables
echo "Uploading environment variables..."
upload_env_vars "$ENV_VARS_FILE" false

# Upload secret environment variables
echo "Uploading secret variables..."
upload_env_vars "$SECRET_VARS_FILE" true

echo "All environment variables and secrets have been uploaded to GitHub environment: $ENVIRONMENT"