#!/bin/bash
set -e

# Directory containing the built app
APP_DIR=/usr/share/nginx/html

# Function to replace placeholders in JS files with actual environment variables
replace_env_vars() {
  echo "Injecting environment variables..."
  
  # Find all JS files in the app directory
  find $APP_DIR -type f -name "*.js" | while read file; do
    # Replace environment variable placeholders
    if grep -q "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY" "$file"; then
      sed -i "s|import.meta.env.VITE_CLERK_PUBLISHABLE_KEY|\"${VITE_CLERK_PUBLISHABLE_KEY}\"|g" "$file"
      echo "Replaced VITE_CLERK_PUBLISHABLE_KEY in $file"
    fi
    
    if grep -q "import.meta.env.VITE_BACKEND_URL" "$file"; then
      sed -i "s|import.meta.env.VITE_BACKEND_URL|\"${VITE_BACKEND_URL}\"|g" "$file"
      echo "Replaced VITE_BACKEND_URL in $file"
    fi
    
    # Add more replacements for other environment variables if needed
  done
  
  echo "Environment variable injection complete"
}

# Execute the environment variable replacement
replace_env_vars

# Run the CMD
exec "$@"