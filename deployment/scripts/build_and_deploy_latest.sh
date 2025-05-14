#!/bin/bash

set -euo pipefail

# ================================================
# RentDaddy Build and Deploy Script
# ================================================

PROJECT_ROOT=$(git rev-parse --show-toplevel)
source "$PROJECT_ROOT/deployment/scripts/utils.sh"
init_script "RentDaddy Build and Deploy" docker aws

# === ENV Loading ===
load_env "$PROJECT_ROOT/backend/.env.production.local"
load_env "$PROJECT_ROOT/frontend/app/.env.production.local"

# === Validate Required ENV ===
: "${AWS_ACCOUNT_ID:?Missing AWS_ACCOUNT_ID}"
: "${AWS_REGION:?Missing AWS_REGION}"

ECR_BASE="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# === Utility ===
ensure_ecr_repo() {
  local repo=$1
  aws ecr describe-repositories --repository-names "$repo" --region "$AWS_REGION" >/dev/null 2>&1 || {
    log "Creating ECR repository: $repo"
    aws ecr create-repository --repository-name "$repo" --region "$AWS_REGION"
  }
}

ecr_login() {
  log "Logging into ECR..."
  aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_BASE"
}

build_component() {
  local name=$1
  local path=$2
  local dockerfile=$3
  local tag=$4
  local full_repo=$5

  log "=== Building $name ==="
  ensure_ecr_repo "$full_repo"
  ecr_login

  # Debug info for build flags
  log "Build configuration:"
  log "- USE_FRESH_BUILDER: $USE_FRESH_BUILDER"
  log "- USE_REGISTRY_CACHE: $USE_REGISTRY_CACHE"
  
  # COMPLETELY DIFFERENT APPROACH: Use legacy Docker build first, then push the image
  
  # Create a temporary tag for the local image
  local temp_tag="${name}-temp-$(date +%s)"
  
  # Start with a clean slate if --no-cache is specified
  if [ "$USE_REGISTRY_CACHE" != "true" ]; then
    log "⚠️ DISABLING CACHE for $name build - all layers will be rebuilt from scratch"
    
    # Aggressively clean the Docker cache
    log "🧹 Cleaning Docker cache..."
    docker builder prune -af > /dev/null 2>&1 || true
    
    # Remove any locally cached image to ensure a completely fresh start
    docker rmi "$ECR_BASE/$full_repo:$tag" > /dev/null 2>&1 || true
    docker rmi "$temp_tag" > /dev/null 2>&1 || true
    
    # Use basic docker build with --no-cache
    log "Using simple docker build with --no-cache for maximum compatibility"
    build_cmd=(docker build --no-cache)
  else
    log "Using Docker build with cache"
    build_cmd=(docker build)
    
    # Try to pull the latest image for cache
    log "Pulling latest image for cache: $ECR_BASE/$full_repo:$tag"
    if docker pull "$ECR_BASE/$full_repo:$tag" >/dev/null 2>&1; then
      # If pull successful, use it as cache source
      build_cmd+=(--cache-from "$ECR_BASE/$full_repo:$tag")
    else
      log "No previous image found for cache, will build from scratch"
    fi
  fi
  
  # Add platform and tag
  build_cmd+=(
    --platform linux/amd64
    -t "$temp_tag"
  )

  # Add component-specific build args
  if [ "$name" = "frontend" ]; then
    log "Adding frontend-specific build args..."
    
    # Make sure these variables are exported so they're available
    : "${VITE_CLERK_PUBLISHABLE_KEY:?Missing VITE_CLERK_PUBLISHABLE_KEY}"
    : "${VITE_BACKEND_URL:?Missing VITE_BACKEND_URL}"
    
    # Standard frontend-specific build args
    # Note: Not setting VITE_ENV here to respect the value in .env.production.local
    build_cmd+=(
      --build-arg VITE_CLERK_PUBLISHABLE_KEY="$VITE_CLERK_PUBLISHABLE_KEY"
      --build-arg VITE_BACKEND_URL="$VITE_BACKEND_URL"
      --build-arg NODE_ENV="production"
    )
    
    # Add VITE_DOCUMENSO_PUBLIC_URL if it exists
    if [ -n "${VITE_DOCUMENSO_PUBLIC_URL:-}" ]; then
      build_cmd+=(--build-arg VITE_DOCUMENSO_PUBLIC_URL="$VITE_DOCUMENSO_PUBLIC_URL")
    else
      # Default value if not set
      build_cmd+=(--build-arg VITE_DOCUMENSO_PUBLIC_URL="https://docs.curiousdev.net")
    fi

    # Add VITE_DOMAIN_URL and VITE_PORT if they exist (to ensure all variables used in apiConfig are set)
    if [ -n "${VITE_DOMAIN_URL:-}" ]; then
      build_cmd+=(--build-arg VITE_DOMAIN_URL="$VITE_DOMAIN_URL")
      log "- VITE_DOMAIN_URL: $VITE_DOMAIN_URL"
    fi
    
    if [ -n "${VITE_PORT:-}" ]; then
      build_cmd+=(--build-arg VITE_PORT="$VITE_PORT")
      log "- VITE_PORT: $VITE_PORT"
    fi
    
    if [ -n "${VITE_SERVER_URL:-}" ]; then
      build_cmd+=(--build-arg VITE_SERVER_URL="$VITE_SERVER_URL")
      log "- VITE_SERVER_URL: $VITE_SERVER_URL"
    fi
    
    # We're now using the global no-cache setting based on USE_REGISTRY_CACHE flag
    log "Using cache settings from command line flags for frontend build"
    
    log "Frontend build env vars:"
    log "- VITE_CLERK_PUBLISHABLE_KEY: ${VITE_CLERK_PUBLISHABLE_KEY:0:5}..."
    log "- VITE_BACKEND_URL: $VITE_BACKEND_URL"
    log "- VITE_DOCUMENSO_PUBLIC_URL: ${VITE_DOCUMENSO_PUBLIC_URL:-https://docs.curiousdev.net}"
    log "- VITE_ENV: (using value from .env.production.local: ${VITE_ENV:-<not set in environment>})"
    log "- NODE_ENV: production"
  fi

  # Add tag and path to build command
  build_cmd+=(
    -t "$ECR_BASE/$full_repo:$tag"
    -f "$dockerfile"
    "$path"
  )

  # Print the full build command for debugging
  log "Full build command for ${name}:"
  log "----------------------------------------"
  for part in "${build_cmd[@]}"; do
    log "  $part"
  done
  log "----------------------------------------"

  # Run the local build command and capture both stdout and stderr
  log "Running build command for ${name}..."
  "${build_cmd[@]}" 2>&1 | tee "$PROJECT_ROOT/deployment/${name}-build.log"
  
  # Check build result
  build_status=${PIPESTATUS[0]}
  if [ $build_status -ne 0 ]; then
    log "⛔ Build command failed with status $build_status"
    return $build_status
  fi
  
  log "✅ Local build completed successfully"
  
  # Now tag and push to ECR
  log "Tagging image for ECR: $temp_tag -> $ECR_BASE/$full_repo:$tag"
  docker tag "$temp_tag" "$ECR_BASE/$full_repo:$tag"
  
  log "Pushing image to ECR: $ECR_BASE/$full_repo:$tag"
  docker push "$ECR_BASE/$full_repo:$tag"
  push_status=$?
  
  if [ $push_status -ne 0 ]; then
    log "⛔ Push to ECR failed with status $push_status"
    return $push_status
  fi
  
  # Add debug output for the image
  log "Inspecting image environment variables:"
  docker inspect "$temp_tag" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -i "VITE_" || echo "No VITE_ variables found in image"
  
  # Clean up temporary image
  log "Cleaning up temporary image"
  docker rmi "$temp_tag" >/dev/null 2>&1 || true
  
  log "✅ $name pushed to: $ECR_BASE/$full_repo:$tag"
}

force_ecs_deploy() {
  log "Forcing new ECS deployments..."
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local deploy_dir="$PROJECT_ROOT/deployment/simplified_terraform/ecs_deployment_$timestamp"
  mkdir -p "$deploy_dir"

  for svc_arn in $(aws ecs list-services --cluster rentdaddy-cluster --query "serviceArns[]" --output text); do
    local svc_name=$(basename "$svc_arn")
    log "📦 Forcing deployment: $svc_name"
    aws ecs update-service \
      --cluster rentdaddy-cluster \
      --service "$svc_name" \
      --force-new-deployment \
      > "$deploy_dir/${svc_name}.json"
  done
}

# === CLI Flags ===
BUILD_BACKEND=false
BUILD_FRONTEND=false
DEPLOY=false
TAG_BACKEND="latest"
TAG_FRONTEND="prod"
USE_FRESH_BUILDER=true     # Default to using a fresh builder each time
USE_REGISTRY_CACHE=true    # Default to using registry cache
SPECIFIED_BUILD_COMPONENT=false  # Track if user specified a build component

if [ $# -eq 0 ]; then
  BUILD_BACKEND=true
  BUILD_FRONTEND=true
else
  while [[ $# -gt 0 ]]; do
    case $1 in
      -b|--backend) BUILD_BACKEND=true; SPECIFIED_BUILD_COMPONENT=true; shift ;;
      -f|--frontend) BUILD_FRONTEND=true; SPECIFIED_BUILD_COMPONENT=true; shift ;;
      -a|--all) BUILD_BACKEND=true; BUILD_FRONTEND=true; SPECIFIED_BUILD_COMPONENT=true; shift ;;
      -d|--deploy) DEPLOY=true; shift ;;
      -t|--tag)
        TAG_BACKEND="$2"
        TAG_FRONTEND="$2"
        shift 2 ;;
      --reuse-builder) USE_FRESH_BUILDER=false; shift ;;
      --fresh-builder) USE_FRESH_BUILDER=true; shift ;;
      --no-cache)
        USE_REGISTRY_CACHE=false;
        log "🚫 No-cache flag detected: Forcing a clean build with no caching"
        shift
        ;;
      --use-cache)
        USE_REGISTRY_CACHE=true;
        log "✅ Use-cache flag detected: Using build cache"
        shift
        ;;
      -h|--help)
        echo "Usage: $0 [-b|-f|-a] [-t TAG] [--deploy] [--reuse-builder|--fresh-builder] [--use-cache|--no-cache]"
        echo ""
        echo "Build Options:"
        echo "  -b, --backend         Build backend only"
        echo "  -f, --frontend        Build frontend only"
        echo "  -a, --all             Build all components (default if no component specified)"
        echo ""
        echo "Tag Options:"
        echo "  -t, --tag TAG         Specify tag for all images (defaults: backend=latest, frontend=prod)"
        echo ""
        echo "Deployment Options:"
        echo "  -d, --deploy          Force ECS deployment after build"
        echo ""
        echo "Cache Control Options:"
        echo "  --reuse-builder       Reuse existing Docker builder if available (better local caching)"
        echo "  --fresh-builder       Use a fresh builder for each component (default)"
        echo "  --use-cache           Use registry cache by pulling latest image (default)"
        echo "  --no-cache            Don't use registry cache"
        exit 0 ;;
      *) echo "Unknown option: $1"; exit 1 ;;
    esac
  done
  
  # If only cache or builder flags were specified but no build components, default to building all
  if [ "$SPECIFIED_BUILD_COMPONENT" = "false" ]; then
    log "No specific components selected for build, defaulting to building all components"
    BUILD_BACKEND=true
    BUILD_FRONTEND=true
  fi
fi

# === Builds ===
BUILD_SUCCESS=true

$BUILD_BACKEND && {
  if ! build_component "backend" "$PROJECT_ROOT/backend" "$PROJECT_ROOT/backend/Dockerfile.prod" "$TAG_BACKEND" "rentdaddy/backend"; then
    log "❌ Backend build failed"
    BUILD_SUCCESS=false
  fi
}

$BUILD_FRONTEND && {
  # Clean dist directory before building to prevent stale built files from being included
  log "Cleaning frontend dist directory..."
  rm -rf "$PROJECT_ROOT/frontend/app/dist"
  
  if ! build_component "frontend" "$PROJECT_ROOT/frontend/app" "$PROJECT_ROOT/frontend/app/Dockerfile.prod" "$TAG_FRONTEND" "rentdaddy/frontend"; then
    log "❌ Frontend build failed"
    BUILD_SUCCESS=false
  fi
}

# Worker build section has been completely removed
# Architecture note: The documenso-worker component has been completely removed from production
# Documenso integration now works through direct API calls and webhook handling in the backend
# Manual configuration is required via the admin UI

# === Optional Deploy ===
if $DEPLOY && $BUILD_SUCCESS; then
  force_ecs_deploy
elif $DEPLOY && ! $BUILD_SUCCESS; then
  log "❌ Skipping deployment: one or more builds failed"
  exit 1
fi

$BUILD_SUCCESS && log "🎉 All builds and optional deployment completed successfully!"
