# Launch main app instance
aws ec2 run-instances --image-id ami-09dc1ba68d413c979 --instance-type t3.micro --key-name rentdaddy_key --security-group-ids sg-058a735cee486ccc1 --subnet-id subnet-0682dc9a121e348b7 --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=rentdaddy-main-app-manual}]' --region us-east-2

# Launch Documenso instance
aws ec2 run-instances --image-id ami-09dc1ba68d413c979 --instance-type t3.small --key-name rentdaddy_key --security-group-ids sg-058a735cee486ccc1 --subnet-id subnet-0682dc9a121e348b7 --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=rentdaddy-documenso-manual}]' --region us-east-2

# Create EIPs
MAIN_EIP=$(aws ec2 allocate-address --domain vpc --region us-east-2 --query AllocationId --output text)
DOC_EIP=$(aws ec2 allocate-address --domain vpc --region us-east-2 --query AllocationId --output text)

# Wait for instances to be running (add a short delay)
sleep 15

# Get instance IDs
MAIN_INSTANCE=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=rentdaddy-main-app-manual" --query "Reservations[].Instances[?State.Name=='running'].[InstanceId]" --output text --region us-east-2)
DOC_INSTANCE=$(aws ec2 describe-instances --filters "Name=tag:Name,Values=rentdaddy-documenso-manual" --query "Reservations[].Instances[?State.Name=='running'].[InstanceId]" --output text --region us-east-2)

# Associate EIPs
aws ec2 associate-address --instance-id $MAIN_INSTANCE --allocation-id $MAIN_EIP --region us-east-2
aws ec2 associate-address --instance-id $DOC_INSTANCE --allocation-id $DOC_EIP --region us-east-2

# Get the public IPs
MAIN_IP=$(aws ec2 describe-addresses --allocation-ids $MAIN_EIP --query "Addresses[0].PublicIp" --output text --region us-east-2)
DOC_IP=$(aws ec2 describe-addresses --allocation-ids $DOC_EIP --query "Addresses[0].PublicIp" --output text --region us-east-2)

echo "Main App IP: $MAIN_IP"
echo "Documenso IP: $DOC_IP"

# Create Route 53 zone
ZONE_ID=$(aws route53 create-hosted-zone --name curiousdev.net --caller-reference $(date +%s) --query "HostedZone.Id" --output text | sed 's/\/hostedzone\///')

# Create Route 53 records
aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch "{\"Changes\":[{\"Action\":\"CREATE\",\"ResourceRecordSet\":{\"Name\":\"curiousdev.net\",\"Type\":\"A\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"$MAIN_IP\"}]}}]}"

aws route53 change-resource-record-sets --hosted-zone-id $ZONE_ID --change-batch "{\"Changes\":[{\"Action\":\"CREATE\",\"ResourceRecordSet\":{\"Name\":\"docs.curiousdev.net\",\"Type\":\"A\",\"TTL\":300,\"ResourceRecords\":[{\"Value\":\"$DOC_IP\"}]}}]}"

# Get nameservers
NAMESERVERS=$(aws route53 get-hosted-zone --id $ZONE_ID --query "DelegationSet.NameServers" --output text)
echo "Update your domain registrar with these nameservers:"
echo $NAMESERVERS