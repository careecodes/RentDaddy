#!/bin/bash
# Script to resend Documenso webhook events for completed documents
# Run this directly on the EC2 instance hosting your RentDaddy backend

# Banner
echo "==============================================="
echo "   Documenso Webhook Resend Tool (EC2 Direct)  "
echo "==============================================="

# Config
WEBHOOK_SECRET="4a2357d9ebe0bf092ac90142a5673774f493954632da600bbc675f19fe512bdb"

# Get container ID of the backend container
BACKEND_CONTAINER=$(docker ps --filter name=backend --format "{{.ID}}")
if [ -z "$BACKEND_CONTAINER" ]; then
  echo "❌ Error: Backend container not found"
  echo "Make sure you're running this on the correct EC2 instance"
  exit 1
fi

echo "✅ Found backend container: $BACKEND_CONTAINER"

# Get database connection info from the backend container environment
echo "🔍 Getting database connection info from container..."
DB_ENV=$(docker exec $BACKEND_CONTAINER env | grep -E 'POSTGRES_(USER|PASSWORD|HOST|DB)')
eval $(echo "$DB_ENV" | sed 's/^/export /')

echo "🔍 Examining lease status in database..."

# Query the database for completed documents that need webhook resending (both draft and pending_approval)
PENDING_LEASES=$(docker exec $BACKEND_CONTAINER sh -c "
  echo \"SELECT id, external_doc_id, status, apartment_id FROM leases WHERE (status = 'pending_approval' OR status = 'draft') AND external_doc_id IS NOT NULL AND external_doc_id != '';\" | 
  PGPASSWORD=\$POSTGRES_PASSWORD psql -h \$POSTGRES_HOST -U \$POSTGRES_USER -d \$POSTGRES_DB -t
")

if [ -z "$PENDING_LEASES" ]; then
  echo "ℹ️ No pending leases with document IDs found"
  
  # For manual testing, let's check if the webhook endpoint works with a test doc ID
  echo "🧪 Would you like to test the webhook endpoint with a manual document ID? (y/n)"
  read TEST_ANSWER
  
  if [[ "$TEST_ANSWER" == "y" ]]; then
    echo "Enter document ID to test: "
    read TEST_DOC_ID
    
    if [ -z "$TEST_DOC_ID" ]; then
      echo "❌ Invalid document ID"
      exit 1
    fi
    
    echo "🧪 Testing webhook with document ID $TEST_DOC_ID"
    PAYLOAD="{\"event\":\"DOCUMENT_COMPLETED\",\"payload\":{\"id\":$TEST_DOC_ID}}"
    
    # Send webhook directly to the backend container
    RESULT=$(curl -s -X POST -H "Content-Type: application/json" -H "X-Documenso-Secret: $WEBHOOK_SECRET" \
      -d "$PAYLOAD" http://localhost:8080/webhooks/documenso)
    
    echo "📊 Webhook test result: $RESULT"
    echo "✅ Check Docker logs for processing details"
  fi
  
  exit 0
fi

# Count how many leases we found
LEASE_COUNT=$(echo "$PENDING_LEASES" | grep -v "^$" | wc -l)
echo "📋 Found $LEASE_COUNT leases with pending documents"

# Process each lease
echo "📋 Leases found:"
echo "--------------------------------------------"
echo "ID | Doc ID | Status | Apartment ID"
echo "--------------------------------------------"
echo "$PENDING_LEASES" | grep -v "^$" | sed 's/|/ | /g'
echo "--------------------------------------------"

echo "$PENDING_LEASES" | grep -v "^$" | while read -r line; do
  LEASE_ID=$(echo "$line" | awk '{print $1}')
  DOC_ID=$(echo "$line" | awk '{print $2}')
  STATUS=$(echo "$line" | awk '{print $3}')
  APT_ID=$(echo "$line" | awk '{print $4}')
  
  if [ -z "$LEASE_ID" ] || [ -z "$DOC_ID" ]; then
    echo "❌ Error: Invalid lease or document ID"
    continue
  fi
  
  echo "🔄 Processing lease $LEASE_ID with document $DOC_ID (status: $STATUS, apartment: $APT_ID)"
  
  # Create webhook payload
  PAYLOAD="{\"event\":\"DOCUMENT_COMPLETED\",\"payload\":{\"id\":$DOC_ID}}"
  
  # Send webhook directly to the backend container
  echo "📤 Sending webhook for document $DOC_ID..."
  RESULT=$(curl -s -X POST -H "Content-Type: application/json" -H "X-Documenso-Secret: $WEBHOOK_SECRET" \
    -d "$PAYLOAD" http://localhost:8080/webhooks/documenso)
  
  echo "📊 Result: $RESULT"
  
  # Check logs for this document in real-time
  echo "📋 Recent logs for document $DOC_ID:"
  docker logs --tail 10 $BACKEND_CONTAINER | grep -i "webhook\|document $DOC_ID"
  
  # Wait a moment between requests
  sleep 2
done

echo "✅ Webhook resend process completed"
echo "Check Docker logs for full processing details:"
echo "docker logs $BACKEND_CONTAINER | grep -i webhook"