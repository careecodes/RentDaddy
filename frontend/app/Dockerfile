FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install additional utilities for troubleshooting
RUN apk add --no-cache curl bash

# Copy package files for dependency installation
COPY package.json ./
COPY package-lock.json* ./

# Install dependencies
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Copy all project files
COPY . .

# Print build environment information
RUN echo "Node $(node --version) / NPM $(npm --version)" && \
    echo "Key files:" && \
    ls -la vite.config.* 2>/dev/null || echo "No vite config found" && \
    ls -la src/ 2>/dev/null || echo "No src directory found"

# Set host for Vite development server to allow external access
ENV HOST=0.0.0.0

# Expose the port specified in the Vite configuration
EXPOSE 5173

# Start the development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
