#!/bin/bash

NEW_DEPLOYMENT_DIR="../simplified_terraform/ecs_deployment_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$NEW_DEPLOYMENT_DIR"

for svc_arn in $(aws ecs list-services --cluster rentdaddy-cluster --query "serviceArns[]" --output text); do
  svc_name=$(basename "$svc_arn")
  echo "📦 Forcing new deployment for $svc_name..."
  aws ecs update-service \
    --cluster rentdaddy-cluster \
    --service "$svc_name" \
    --force-new-deployment \
    > "$NEW_DEPLOYMENT_DIR/${svc_name}.json"
done
