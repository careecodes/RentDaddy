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
  if grep -q "import.meta.env.VITE_" "$file"; then
    echo "Processing file: $file"
    
    # Make sure we have the env variables or fallbacks
    CLERK_KEY="${VITE_CLERK_PUBLISHABLE_KEY:-pk_live_Y2xlcmsuY3VyaW91c2Rldi5uZXQk}"
    BACKEND="${VITE_BACKEND_URL:-https://api.curiousdev.net}"
    DOCUMENSO="${VITE_DOCUMENSO_PUBLIC_URL:-https://docs.curiousdev.net}"
    
    echo "Using values: CLERK_KEY=${CLERK_KEY}, BACKEND=${BACKEND}, DOCUMENSO=${DOCUMENSO}"
    
    # Replace environment variables with proper escaping for sed
    CLERK_KEY_ESCAPED=$(echo "$CLERK_KEY" | sed 's/[\/&]/\\&/g')
    BACKEND_ESCAPED=$(echo "$BACKEND" | sed 's/[\/&]/\\&/g')
    DOCUMENSO_ESCAPED=$(echo "$DOCUMENSO" | sed 's/[\/&]/\\&/g')
    
    # Replace environment variables
    sed -i "s|import.meta.env.VITE_CLERK_PUBLISHABLE_KEY|\"${CLERK_KEY_ESCAPED}\"|g" "$file"
    sed -i "s|import.meta.env.VITE_BACKEND_URL|\"${BACKEND_ESCAPED}\"|g" "$file"
    
    # Handle additional environment variables if needed
    if grep -q "import.meta.env.VITE_DOCUMENSO_PUBLIC_URL" "$file"; then
      sed -i "s|import.meta.env.VITE_DOCUMENSO_PUBLIC_URL|\"${DOCUMENSO_ESCAPED}\"|g" "$file"
    fi
    
    # Also add window.VITE_* variables for runtime access
    if grep -q "window.VITE_" "$file"; then
      echo "Updating window.VITE_* variables"
    else
      # Sample detected environment variables in the output
      grep -o "import.meta.env.VITE_[A-Z_]*" "$file" | head -3
    fi
  fi
done

# Create a small script to expose environment variables to the browser
echo "Creating environment variables script..."
cat > ${APP_DIR}/env-config.js << EOF
window.VITE_CLERK_PUBLISHABLE_KEY = "${VITE_CLERK_PUBLISHABLE_KEY:-pk_live_Y2xlcmsuY3VyaW91c2Rldi5uZXQk}";
window.VITE_BACKEND_URL = "${VITE_BACKEND_URL:-https://api.curiousdev.net}";
window.VITE_DOCUMENSO_PUBLIC_URL = "${VITE_DOCUMENSO_PUBLIC_URL:-https://docs.curiousdev.net}";
console.log("Environment variables loaded from env-config.js");
EOF

# Add the env-config.js script to index.html
if [ -f "${APP_DIR}/index.html" ]; then
  if ! grep -q "env-config.js" "${APP_DIR}/index.html"; then
    echo "Adding env-config.js script to index.html"
    sed -i 's|</head>|<script src="/env-config.js"></script>\n</head>|' "${APP_DIR}/index.html"
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