#!/bin/sh
set -e

echo "=== Starting frontend container ==="

# Debug environment variables
echo "Runtime Environment Variables:"
echo "VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY:-not set}"
echo "VITE_BACKEND_URL=${VITE_BACKEND_URL:-not set}"
echo "VITE_DOCUMENSO_PUBLIC_URL=${VITE_DOCUMENSO_PUBLIC_URL:-not set}"
echo "VITE_ENV=${VITE_ENV:-not set}"

# Directory containing the built app
APP_DIR=/usr/share/nginx/html

# Create health check endpoint
echo "OK" > ${APP_DIR}/healthz
echo "Created health check endpoint"

# Debug - list directory contents
echo "Application directory contents:"
ls -la ${APP_DIR}

# Check if assets directory exists and look for CSS files
if [ -d "${APP_DIR}/assets" ]; then
  echo "Assets directory contents:"
  ls -la ${APP_DIR}/assets
  
  echo "Looking for CSS files in assets directory:"
  find ${APP_DIR}/assets -name "*.css" || echo "No CSS files found in assets dir"
else
  echo "WARNING: No assets directory found!"
fi

# Check if css directory exists (from manual SCSS compilation)
if [ -d "${APP_DIR}/css" ]; then
  echo "CSS directory contents:"
  ls -la ${APP_DIR}/css
else
  echo "Manual CSS directory not found - creating it"
  mkdir -p ${APP_DIR}/css
  
  # Try to create a basic CSS file as a fallback
  echo "Creating basic fallback CSS file"
  cat > ${APP_DIR}/css/styles.css << 'EOL'
/* Fallback CSS */
body {
  font-family: sans-serif;
}
.btn-primary {
  background-color: #00674f;
  color: white;
  border-color: #00674f;
}
.btn-secondary {
  background-color: #7789f4;
  color: white;
  border-color: #7789f4;
}
.btn-warning {
  background-color: #d86364;
  color: white;
  border-color: #d86364;
}
.text-success {
  color: green;
}
.text-center {
  text-align: center;
}
.spinner-border {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  border: 0.25em solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spinner-border .75s linear infinite;
}
@keyframes spinner-border {
  to { transform: rotate(360deg); }
}
EOL
fi

# Find all JS files and replace environment variables
echo "Processing JS files for environment variables..."
find ${APP_DIR} -type f -name "*.js" | while read file; do
  # Make sure we have the env variables or fallbacks
  CLERK_KEY="${VITE_CLERK_PUBLISHABLE_KEY:-pk_live_Y2xlcmsuY3VyaW91c2Rldi5uZXQk}"
  BACKEND="${VITE_BACKEND_URL:-https://api.curiousdev.net}"
  DOCUMENSO="${VITE_DOCUMENSO_PUBLIC_URL:-https://docs.curiousdev.net}"
  
  # Replace environment variables with proper escaping for sed
  CLERK_KEY_ESCAPED=$(echo "$CLERK_KEY" | sed 's/[\/&]/\\&/g')
  BACKEND_ESCAPED=$(echo "$BACKEND" | sed 's/[\/&]/\\&/g')
  DOCUMENSO_ESCAPED=$(echo "$DOCUMENSO" | sed 's/[\/&]/\\&/g')
  
  # Check for different patterns of environment variables and hardcoded URLs
  if grep -q -E "import\.meta\.env\.VITE_|\"http://localhost|'http://localhost|return \"http://localhost|return 'http://localhost" "$file"; then
    echo "Processing file: $file"
    echo "Using values: CLERK_KEY=${CLERK_KEY}, BACKEND=${BACKEND}, DOCUMENSO=${DOCUMENSO}"
    
    # Replace standard import.meta.env variables
    sed -i "s|import.meta.env.VITE_CLERK_PUBLISHABLE_KEY|\"${CLERK_KEY_ESCAPED}\"|g" "$file"
    sed -i "s|import.meta.env.VITE_BACKEND_URL|\"${BACKEND_ESCAPED}\"|g" "$file"
    
    if grep -q "import.meta.env.VITE_DOCUMENSO_PUBLIC_URL" "$file"; then
      sed -i "s|import.meta.env.VITE_DOCUMENSO_PUBLIC_URL|\"${DOCUMENSO_ESCAPED}\"|g" "$file"
    fi
    
    # Replace hardcoded localhost URLs with production URLs when in a fallback context
    # First, look for fallbacks that might be in quotes
    sed -i "s|\"http://localhost:8080\"|\"${BACKEND_ESCAPED}\"|g" "$file"
    sed -i "s|'http://localhost:8080'|'${BACKEND_ESCAPED}'|g" "$file"
    
    # Next, look for return statements that might include hardcoded localhost URLs
    sed -i "s|return \"http://localhost:8080\"|return \"${BACKEND_ESCAPED}\"|g" "$file"
    sed -i "s|return 'http://localhost:8080'|return '${BACKEND_ESCAPED}'|g" "$file"
    
    # Also add window.VITE_* variables for runtime access
    if grep -q "window.VITE_" "$file"; then
      echo "Updating window.VITE_* variables"
    fi
    
    # Check if we've missed any localhost references
    if grep -q "localhost" "$file"; then
      echo "WARNING: File still contains localhost references after processing: $file"
      grep -n "localhost" "$file" | head -5
    else
      echo "✅ No localhost references found in file after processing"
    fi
  fi
done

# Final verification - check for any remaining localhost references
echo "Final verification for localhost references in JS files..."
LOCALHOST_FILES=$(find ${APP_DIR} -type f -name "*.js" -exec grep -l "localhost" {} \;)
if [ -n "$LOCALHOST_FILES" ]; then
  echo "⚠️ WARNING: The following files still contain localhost references:"
  echo "$LOCALHOST_FILES"
  echo "First few instances:"
  find ${APP_DIR} -type f -name "*.js" -exec grep -n "localhost" {} \; | head -5
else
  echo "✅ No localhost references found in any JS files"
fi

# Create a small script to expose environment variables to the browser as a fallback
# This is a backup in case Vite's build-time replacement doesn't work
echo "Creating environment variables script for fallback..."
cat > ${APP_DIR}/env-config.js << EOF
// This script provides fallback values for environment variables
// It should only be used if the Vite build-time replacement fails
(function() {
  // Check if import.meta.env variables are already defined
  if (typeof window.VITE_ENV_INITIALIZED === 'undefined') {
    console.log("Initializing environment variables via env-config.js fallback");
    
    // Only set these if they're not already set by Vite
    if (!window.import || !window.import.meta || !window.import.meta.env) {
      // Create or use existing import.meta.env object
      window.import = window.import || {};
      window.import.meta = window.import.meta || {};
      window.import.meta.env = window.import.meta.env || {};
      
      // Set environment variables
      window.import.meta.env.VITE_CLERK_PUBLISHABLE_KEY = "${VITE_CLERK_PUBLISHABLE_KEY:-pk_live_Y2xlcmsuY3VyaW91c2Rldi5uZXQk}";
      window.import.meta.env.VITE_BACKEND_URL = "${VITE_BACKEND_URL:-https://api.curiousdev.net}";
      window.import.meta.env.VITE_DOCUMENSO_PUBLIC_URL = "${VITE_DOCUMENSO_PUBLIC_URL:-https://docs.curiousdev.net}";
      window.import.meta.env.MODE = "production";
      window.import.meta.env.PROD = true;
      window.import.meta.env.DEV = false;
    
      // Also set window-level variables for compatibility
      window.VITE_CLERK_PUBLISHABLE_KEY = "${VITE_CLERK_PUBLISHABLE_KEY:-pk_live_Y2xlcmsuY3VyaW91c2Rldi5uZXQk}";
      window.VITE_BACKEND_URL = "${VITE_BACKEND_URL:-https://api.curiousdev.net}";
      window.VITE_DOCUMENSO_PUBLIC_URL = "${VITE_DOCUMENSO_PUBLIC_URL:-https://docs.curiousdev.net}";
    }
    
    // Mark as initialized to avoid double initialization
    window.VITE_ENV_INITIALIZED = true;
    
    console.log("Environment variables loaded from env-config.js");
  }
})();
EOF

# Add the env-config.js script to index.html at the BEGINNING of head
# This ensures it loads before any other scripts that might need these variables
if [ -f "${APP_DIR}/index.html" ]; then
  if ! grep -q "env-config.js" "${APP_DIR}/index.html"; then
    echo "Adding env-config.js script to beginning of head in index.html"
    sed -i 's|<head>|<head>\n<script src="/env-config.js"></script>|' "${APP_DIR}/index.html"
  fi
fi

# Let Vite handle CSS links - it already adds the right ones during the build process
echo "Using Vite-generated CSS links (already in the HTML)"

# Add only the fallback CSS if it exists
if [ -f "${APP_DIR}/css/styles.css" ]; then
  echo "Adding fallback CSS link if needed"
  if ! grep -q "stylesheet.*css/styles.css" "${APP_DIR}/index.html"; then
    sed -i 's|</head>|<link rel="stylesheet" href="/css/styles.css" />\n</head>|' "${APP_DIR}/index.html"
  fi
fi

echo "Starting Nginx..."
exec nginx -g "daemon off;"