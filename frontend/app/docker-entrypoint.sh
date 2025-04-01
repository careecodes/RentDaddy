#!/bin/sh
set -e

echo "=== Starting frontend container ==="

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
    
    # Replace environment variables
    sed -i "s|import.meta.env.VITE_CLERK_PUBLISHABLE_KEY|\"${VITE_CLERK_PUBLISHABLE_KEY}\"|g" "$file"
    sed -i "s|import.meta.env.VITE_BACKEND_URL|\"${VITE_BACKEND_URL}\"|g" "$file"
    
    # Handle additional environment variables if needed
    if grep -q "import.meta.env.VITE_SERVER_URL" "$file"; then
      sed -i "s|import.meta.env.VITE_SERVER_URL|\"${VITE_SERVER_URL:-https://api.curiousdev.net}\"|g" "$file"
    fi
    
    if grep -q "import.meta.env.VITE_DOMAIN_URL" "$file"; then
      sed -i "s|import.meta.env.VITE_DOMAIN_URL|\"${VITE_DOMAIN_URL:-https://app.curiousdev.net}\"|g" "$file"
    fi
  fi
done

# Update the index.html to ensure CSS links are present
echo "Checking index.html for CSS links..."
if [ -f "${APP_DIR}/index.html" ]; then
  if ! grep -q "stylesheet.*assets/styles.css" "${APP_DIR}/index.html"; then
    echo "Adding CSS links to index.html"
    sed -i 's|</head>|<link rel="stylesheet" href="/assets/styles.css" />\n<link rel="stylesheet" href="/css/styles.css" />\n</head>|' "${APP_DIR}/index.html"
  fi
fi

echo "Starting Nginx..."
exec nginx -g "daemon off;"