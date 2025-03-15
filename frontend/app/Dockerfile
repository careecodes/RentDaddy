FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install additional utilities for troubleshooting
RUN apk add --no-cache curl bash

# Layer for dependencies - this will be cached unless package files change
FROM base AS dependencies
COPY package*.json ./


# If windows-based system, use CI install and ensure POSIX-compatible line endings for Windows compatibility. Else use npm i.
# if package-lock.json exists, run npm i
# if none exists, run npm ci
# --no-audit: skips security vulnerability check - if ever used for production, must be removed
# --no-fund: skips funding messages
RUN if [ "$(uname -s)" = "Windows_NT" ]; then \
    if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm i --no-audit --no-fund; fi; \
    else \
    if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm i --no-audit --no-fund; fi; \
    fi && \
    echo "Dependencies installed successfully"


# Build layer - uses the dependencies layer
FROM dependencies AS build
# Copy all project files (respecting .dockerignore)
COPY . .

# TODO: UNCOMMENT IF WE HAVE SETUP SCRIPTS ON THE FRONT-END
# # Handle Windows line endings in shell scripts if present
# RUN find . -type f -name "*.sh" -exec sed -i 's/\r$//' {} \; || true

# THIS ONLY GETS PRINTED DURING THE BUILD PHASE
# Print build environment information
RUN echo "Node $(node --version) / NPM $(npm --version)" && \
    echo "Key files:" && \
    ls -la vite.config.* 2>/dev/null || echo "No vite config found" && \
    ls -la src/ 2>/dev/null || echo "No src directory found"

# Final image
FROM build AS runtime

# Set host for Vite development server to allow external access
ENV HOST=0.0.0.0

# Expose the port specified in the Vite configuration
EXPOSE 5173

# Start the development server (with a simple command to improve readability)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

#######################
## Simpler version
#######################
# FROM node:20-alpine

# WORKDIR /app

# COPY . .

# RUN npm ci

# EXPOSE 5173

# # Start development server if possible, otherwise show message
# CMD ["sh", "-c", "if grep -q 'dev' package.json; then npm run dev -- --host 0.0.0.0; else echo 'No dev script found. Please configure package.json'; fi"]