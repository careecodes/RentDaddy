#!/bin/bash
# Run these commands on the instance in us-east-2b

# Create the directory
sudo mkdir -p /opt/documenso

# Download certificate directly from S3 
sudo aws s3 cp s3://rentdaddy-artifacts/certs/cert.p12 /opt/documenso/cert.p12 --region us-east-2

# Set proper permissions
sudo chmod 644 /opt/documenso/cert.p12

# Verify the certificate is in place
ls -la /opt/documenso/cert.p12

# Restart Docker and ECS agent
sudo systemctl restart docker
sudo systemctl restart ecs

# Check ECS agent logs
echo "ECS agent logs:"
sudo tail -n 50 /var/log/ecs/ecs-agent.log

# Check the ECS configuration
echo "ECS Configuration:"
cat /etc/ecs/ecs.config

# Check ECS agent status
echo "ECS Agent Status:"
sudo systemctl status ecs

# View docker containers (ECS agent should be running)
echo "Docker containers:"
sudo docker ps