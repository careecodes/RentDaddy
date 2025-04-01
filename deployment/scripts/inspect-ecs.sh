#!/usr/bin/env zsh

KEY_PATH="~/.ssh/rentdaddy_key" # Using the same key added to ssh-agent
USER="ec2-user"

# Current active instances
typeset -A HOSTS
HOSTS=(
  "i-07fc1015320b68724" "3.129.247.229"
  "i-0ded6293342aa51bf" "13.59.239.189"
)

for INSTANCE in ${(k)HOSTS}; do
  HOST="${HOSTS[$INSTANCE]}"
  echo "🔍 Connecting to $INSTANCE ($HOST)..."
  ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no "$USER@$HOST" <<'EOF'
    echo "✅ Connected: $(hostname)"
    echo "🧾 docker ps"
    docker ps

    CONTAINERS=$(docker ps -q)
    if [ -z "$CONTAINERS" ]; then
      echo "⚠️ No running containers."
    else
      for ID in $CONTAINERS; do
        echo -e "\n📦 Logs for container: $ID"
        docker logs --tail 50 "$ID"
      done
    fi
    echo "--------------------------------------------"
EOF
done