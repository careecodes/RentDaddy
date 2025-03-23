#!/bin/sh

# Database seeder script that uses OVERRIDING SYSTEM VALUE 
# to force admin ID to be 100

echo "🚀 Starting database seeder script..."

# API URL (localhost since we're inside the container)
API_URL="http://localhost:8080"

# PostgreSQL connection details for inside the container
PG_HOST="postgres"
PG_USER="appuser"
PG_DB="appdb"

# Number of records to create
NUM_RECORDS=5

# Alternating email addresses
EMAIL_ONE="reem@reemock.com" 
EMAIL_TWO="reem.mokhtar@gmail.com"

# Today's date and one year from today (BusyBox compatible)
TODAY=$(date +"%Y-%m-%d")
YEAR=$(date +"%Y")
MONTH=$(date +"%m")
DAY=$(date +"%d")
NEXT_YEAR=$((YEAR + 1))
ONE_YEAR="${NEXT_YEAR}-${MONTH}-${DAY}"

echo "Using date range: $TODAY to $ONE_YEAR"

# Define user data
LANDLORD_NAME="First Landlord"
LANDLORD_EMAIL="wrldconnect1@gmail.com"
TENANT_FIRST_NAMES="Seed Soso Yolo Toon Bean"
TENANT_LAST_NAMES="Ogg Lewis Wilson Soon SchraderBachar"
TENANT_CLERK_IDS="user_seed user_soso user_yolo user_toon user_bean"
TENANT_PHONES="+15551234001 +15551234002 +15551234003 +15551234004 +15551234005"

# Define apartment data
APARTMENT_UNIT_NUMBERS="102 206 213 334 180"
APARTMENT_PRICES="2000.00 1800.00 2223.00 1950.00 2150.00"
APARTMENT_SIZES="850 800 900 825 875"

# Helper function to get an item from a space-separated list by index
get_item() {
  echo "$1" | cut -d' ' -f$2
}

# Helper function to extract only the number from PostgreSQL output
extract_id() {
  echo "$1" | grep -o '[0-9]\+' | head -1
}

# Arrays to store IDs (using temporary files for BusyBox compatibility)
TENANT_IDS_FILE=$(mktemp)
APARTMENT_IDS_FILE=$(mktemp)

# Step 1: Create admin user with ID 100 (using OVERRIDING SYSTEM VALUE)
echo "Step 1: Creating admin user with ID 100..."

# First check if user with ID 100 already exists
USER_EXISTS=$(psql -h $PG_HOST -U $PG_USER -d $PG_DB -t -c "SELECT COUNT(*) FROM users WHERE id = 100;")
USER_EXISTS=$(extract_id "$USER_EXISTS")

if [ "$USER_EXISTS" -eq "0" ]; then
  # Create the admin user with ID 100 using the correct OVERRIDING SYSTEM VALUE syntax
  psql -h $PG_HOST -U $PG_USER -d $PG_DB -c "
  -- Delete existing ID with the same clerk_id if it exists
  DELETE FROM users WHERE clerk_id = 'admin_user_100';
  
  -- Create the admin user with ID 100
  INSERT INTO users (id, clerk_id, first_name, last_name, email, phone, role, status) 
  OVERRIDING SYSTEM VALUE
  VALUES (100, 'admin_user_100', '$LANDLORD_NAME', 'Admin', '$LANDLORD_EMAIL', '+15551234000', 'admin', 'active');
  "
  echo "Created admin user with ID: 100"
else
  echo "Admin user with ID 100 already exists"
fi

# Create tenant users
echo "Step 2: Creating tenant users..."
for i in $(seq 1 $NUM_RECORDS); do
  TENANT_FIRST_NAME=$(get_item "$TENANT_FIRST_NAMES" $i)
  TENANT_LAST_NAME=$(get_item "$TENANT_LAST_NAMES" $i)
  TENANT_CLERK_ID=$(get_item "$TENANT_CLERK_IDS" $i)
  TENANT_PHONE=$(get_item "$TENANT_PHONES" $i)
  
  # Use alternating email addresses
  if [ $(( (i-1) % 2)) -eq 0 ]; then
    EMAIL=$EMAIL_ONE
  else
    EMAIL=$EMAIL_TWO
  fi
  
  # First delete any existing user with the same clerk_id
  psql -h $PG_HOST -U $PG_USER -d $PG_DB -c "DELETE FROM users WHERE clerk_id = '$TENANT_CLERK_ID';"
  
  # Create tenant user
  TENANT_SQL="INSERT INTO users (clerk_id, first_name, last_name, email, phone, role, status) 
             VALUES ('$TENANT_CLERK_ID', '$TENANT_FIRST_NAME', '$TENANT_LAST_NAME', '$EMAIL', '$TENANT_PHONE', 'tenant', 'active') 
             RETURNING id;"
  
  TENANT_ID_RAW=$(psql -h $PG_HOST -U $PG_USER -d $PG_DB -t -c "$TENANT_SQL")
  TENANT_ID=$(extract_id "$TENANT_ID_RAW")
  echo "Created tenant #$i: $TENANT_FIRST_NAME $TENANT_LAST_NAME (ID: $TENANT_ID)"
  
  # Store ID for later use
  echo "$TENANT_ID" >> $TENANT_IDS_FILE
done
echo "✅ Created $NUM_RECORDS tenants"

# Create apartments
echo "Step 3: Creating apartments..."
for i in $(seq 1 $NUM_RECORDS); do
  APARTMENT_UNIT_NUMBER=$(get_item "$APARTMENT_UNIT_NUMBERS" $i)
  APARTMENT_PRICE=$(get_item "$APARTMENT_PRICES" $i)
  APARTMENT_SIZE=$(get_item "$APARTMENT_SIZES" $i)
  
  # First delete any existing apartment with the same unit number
  psql -h $PG_HOST -U $PG_USER -d $PG_DB -c "DELETE FROM apartments WHERE unit_number = $APARTMENT_UNIT_NUMBER;"
  
  APT_SQL="INSERT INTO apartments (unit_number, price, size, management_id, availability) 
          VALUES ($APARTMENT_UNIT_NUMBER, $APARTMENT_PRICE, $APARTMENT_SIZE, 100, true) 
          RETURNING id;"
  
  APT_ID_RAW=$(psql -h $PG_HOST -U $PG_USER -d $PG_DB -t -c "$APT_SQL")
  APT_ID=$(extract_id "$APT_ID_RAW")
  echo "Created apartment #$i: Unit $APARTMENT_UNIT_NUMBER (ID: $APT_ID)"
  
  # Store ID for later use
  echo "$APT_ID" >> $APARTMENT_IDS_FILE
done
echo "✅ Created $NUM_RECORDS apartments"

# Create leases
echo "Step 4: Creating leases..."
for i in $(seq 1 $NUM_RECORDS); do
  TENANT_FIRST_NAME=$(get_item "$TENANT_FIRST_NAMES" $i)
  TENANT_LAST_NAME=$(get_item "$TENANT_LAST_NAMES" $i)
  TENANT_NAME="$TENANT_FIRST_NAME $TENANT_LAST_NAME"
  
  # Get IDs from our files, by line number
  TENANT_ID_RAW=$(sed -n "${i}p" $TENANT_IDS_FILE)
  TENANT_ID=$(extract_id "$TENANT_ID_RAW")
  
  APT_ID_RAW=$(sed -n "${i}p" $APARTMENT_IDS_FILE)
  APT_ID=$(extract_id "$APT_ID_RAW")
  
  APARTMENT_NUMBER=$(get_item "$APARTMENT_UNIT_NUMBERS" $i)
  APARTMENT_PRICE=$(get_item "$APARTMENT_PRICES" $i)
  
  # Use alternating email addresses
  if [ $(( (i-1) % 2)) -eq 0 ]; then
    EMAIL=$EMAIL_ONE
  else
    EMAIL=$EMAIL_TWO
  fi
  
  echo "Creating lease #$i for tenant $TENANT_NAME (ID: $TENANT_ID) with email $EMAIL"
  echo "  Apartment: #$APARTMENT_NUMBER (ID: $APT_ID)"
  
  # Create the lease with a draft status
  # NOTE: Using hardcoded landlord_id=100 to match the value in leases.go
  LEASE_PAYLOAD="{\"tenant_id\":$TENANT_ID,\"landlord_id\":100,\"apartment_id\":$APT_ID,\"start_date\":\"$TODAY\",\"end_date\":\"$ONE_YEAR\",\"rent_amount\":$APARTMENT_PRICE,\"lease_status\":\"draft\",\"document_title\":\"Residential Lease Agreement - Unit $APARTMENT_NUMBER\",\"lease_number\":1,\"created_by\":100,\"updated_by\":100,\"tenant_name\":\"$TENANT_NAME\",\"tenant_email\":\"$EMAIL\",\"property_address\":\"123 Main Street, Apartment $APARTMENT_NUMBER\",\"replace_existing\":true}"

  # Call API to create the lease
  echo "Sending API request to create lease..."
  LEASE_RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    $API_URL/admin/tenants/leases/create \
    -d "$LEASE_PAYLOAD")
  
  # Extract lease ID and document ID from the response
  LEASE_ID=""
  if echo "$LEASE_RESPONSE" | grep -q '"lease_id":'; then
    LEASE_ID=$(echo "$LEASE_RESPONSE" | sed -n 's/.*"lease_id":\([0-9]*\).*/\1/p')
  fi
  
  DOCUMENT_ID=""
  if echo "$LEASE_RESPONSE" | grep -q '"external_doc_id":'; then
    DOCUMENT_ID=$(echo "$LEASE_RESPONSE" | sed -n 's/.*"external_doc_id":"\([^"]*\)".*/\1/p')
  fi
  
  if [ ! -z "$LEASE_ID" ]; then
    echo "  ✅ Created lease ID: $LEASE_ID"
    echo "  📄 Documenso document ID: $DOCUMENT_ID"
  else
    echo "  ❌ Failed to create lease. Response: $LEASE_RESPONSE"
  fi
  
  echo "----------------------------------------"
  sleep 2
done

# Clean up temporary files
rm -f $TENANT_IDS_FILE $APARTMENT_IDS_FILE

echo "✅ Database seeding completed!"
echo "You can now test your Documenso webhook integration."