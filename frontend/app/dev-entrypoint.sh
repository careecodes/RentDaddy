#!/bin/sh
set -e

echo "=== Starting frontend development container ==="

# Debug environment variables
echo "Docker Environment Variables:"
echo "VITE_CLERK_PUBLISHABLE_KEY=${VITE_CLERK_PUBLISHABLE_KEY:-not set}"
echo "VITE_BACKEND_URL=${VITE_BACKEND_URL:-not set}"
echo "VITE_SERVER_URL=${VITE_SERVER_URL:-not set}"
echo "VITE_ENV=${VITE_ENV:-not set}"

# Start Vite dev server with the same environment variables
exec npm run dev -- --host 0.0.0.0