# setup-monitoring.sh

#!/bin/bash
set -e

# Variables
INSTANCE_IP=$1
SSH_KEY=$2
INSTANCE_TYPE=$3  # "main" or "documenso"

if [[ -z "$INSTANCE_IP" || -z "$SSH_KEY" || -z "$INSTANCE_TYPE" ]]; then
  echo "Usage: $0 <instance-ip> <ssh-key-path> <instance-type>"
  echo "Where instance-type is 'main' or 'documenso'"
  exit 1
fi

echo "Setting up monitoring for $INSTANCE_TYPE instance at $INSTANCE_IP..."

# Create monitoring scripts
TEMP_DIR=$(mktemp -d)

# CloudWatch Agent config
cat > $TEMP_DIR/amazon-cloudwatch-agent.json << 'EOF'
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "metrics": {
    "metrics_collected": {
      "disk": {
        "measurement": ["used_percent"],
        "resources": ["/"],
        "ignore_file_system_types": ["sysfs", "devtmpfs"]
      },
      "mem": {
        "measurement": ["mem_used_percent"]
      },
      "swap": {
        "measurement": ["swap_used_percent"]
      }
    },
    "append_dimensions": {
      "InstanceId": "${aws:InstanceId}"
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/messages",
            "log_group_name": "system-logs",
            "log_stream_name": "{instance_id}-system-logs"
          },
          {
            "file_path": "/home/ec2-user/service-restarts.log",
            "log_group_name": "service-logs",
            "log_stream_name": "{instance_id}-service-logs"
          }
        ]
      }
    }
  }
}
EOF

# Docker stats collection script
cat > $TEMP_DIR/collect-docker-stats.sh << 'EOF'
#!/bin/bash
STATS_DIR=~/monitoring
mkdir -p $STATS_DIR

# Collect Docker stats
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" > $STATS_DIR/docker-stats-$TIMESTAMP.txt

# Keep only the last 48 stats files (assuming we run every 30 minutes = 24 hours of data)
ls -t $STATS_DIR/docker-stats-*.txt | tail -n +49 | xargs -r rm
EOF

# System monitoring script
cat > $TEMP_DIR/system-monitor.sh << 'EOF'
#!/bin/bash
LOG_FILE=~/monitoring/system-stats.log
ALERT_LOG=~/monitoring/alerts.log
mkdir -p ~/monitoring

# Get system stats
TIMESTAMP=$(date +%Y-%m-%d %H:%M:%S)
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}')
MEMORY_USAGE=$(free | grep Mem | awk '{print $3/$2 * 100.0}')
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

# Log stats
echo "$TIMESTAMP CPU: $CPU_USAGE% MEM: $MEMORY_USAGE% DISK: $DISK_USAGE%" >> $LOG_FILE

# Check thresholds and alert if necessary
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
  echo "$TIMESTAMP - HIGH CPU USAGE: $CPU_USAGE%" >> $ALERT_LOG
fi

if (( $(echo "$MEMORY_USAGE > 85" | bc -l) )); then
  echo "$TIMESTAMP - HIGH MEMORY USAGE: $MEMORY_USAGE%" >> $ALERT_LOG
fi

if (( $(echo "$DISK_USAGE > 85" | bc -l) )); then
  echo "$TIMESTAMP - HIGH DISK USAGE: $DISK_USAGE%" >> $ALERT_LOG
fi

# Rotate log if it gets too large
if [[ $(stat -c%s "$LOG_FILE") -gt 10485760 ]]; then  # 10MB
  mv $LOG_FILE $LOG_FILE.$(date +%Y%m%d)
  gzip $LOG_FILE.$(date +%Y%m%d)
fi
EOF

# Create archive
MONITOR_ARCHIVE="monitoring-setup.tar.gz"
tar -czf $MONITOR_ARCHIVE -C $TEMP_DIR .

# Copy to server
scp -i $SSH_KEY $MONITOR_ARCHIVE ec2-user@$INSTANCE_IP:~/

# Set up monitoring
ssh -i $SSH_KEY ec2-user@$INSTANCE_IP << EOF
  mkdir -p ~/monitoring
  tar -xzf ~/monitoring-setup.tar.gz -C ~/
  
  # Make scripts executable
  chmod +x ~/collect-docker-stats.sh
  chmod +x ~/system-monitor.sh
  
  # Install required packages
  sudo yum install -y bc amazon-cloudwatch-agent
  
  # Configure CloudWatch agent
  sudo cp ~/amazon-cloudwatch-agent.json /opt/aws/amazon-cloudwatch-agent/etc/
  sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
  
  # Set up crontab for monitoring
  (crontab -l 2>/dev/null; echo "*/30 * * * * ~/collect-docker-stats.sh") | crontab -
  (crontab -l 2>/dev/null; echo "*/5 * * * * ~/system-monitor.sh") | crontab -
  
  # Clean up
  rm ~/monitoring-setup.tar.gz
EOF

# Clean up local files
rm -rf $TEMP_DIR
rm $MONITOR_ARCHIVE

echo "Monitoring set up successfully for $INSTANCE_TYPE instance!"