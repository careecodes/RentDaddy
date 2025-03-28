# Get list of stopped tasks
STOPPED_TASKS=$(aws ecs list-tasks --cluster rentdaddy-cluster --desired-status STOPPED --query 'taskArns[]' --output text)

# Loop through each task and delete it
for TASK in $STOPPED_TASKS; do
  echo "Deleting task $TASK"
  aws ecs delete-task --cluster rentdaddy-cluster --task $TASK
done