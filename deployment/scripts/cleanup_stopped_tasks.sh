aws ecs list-tasks \
  --cluster rentdaddy-cluster \
  --desired-status STOPPED \
  --output text \
  --query 'taskArns[*]' | tr '\t' '\n' | while read arn; do
    echo "Stopping $arn"
    aws ecs stop-task --cluster rentdaddy-cluster --task "$arn" --reason "manual cleanup"
done
