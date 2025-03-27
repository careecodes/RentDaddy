#!/bin/sh

export PGPASSWORD=$POSTGRES_PASSWORD


# Database seeder script that authenticates with Clerk and creates test data

echo "🚀 Starting database seeder script..."

# Get configuration from environment variables or use defaults
API_HOST="${DOMAIN_URL:-http://localhost}"
API_PORT="${PORT:-8080}"
API_URL="${API_HOST}:${API_PORT}"

# PostgreSQL connection details from environment variables
PG_HOST="${POSTGRES_HOST:-postgres}"
PG_USER="${POSTGRES_USER:-appuser}"
PG_DB="${POSTGRES_DB:-appdb}"

echo "Using database connection: $PG_HOST / $PG_USER / $PG_DB"
echo "Using API URL: $API_URL"

# Check for required Clerk credentials
if [ -z "$CLERK_SECRET_KEY" ]; then
  echo "CLERK_SECRET_KEY must be set in environment variables."
  exit 1
fi

# Use CLERK_LANDLORD_USER_ID from environment or fall back to a default
CLERK_LANDLORD_USER_ID="${CLERK_LANDLORD_USER_ID:-user_2QANfT1DgWJy6F5GNuJ7rGQcLYR}"
echo "Using Clerk landlord ID: $CLERK_LANDLORD_USER_ID"
echo "Step 0: Creating a Clerk session token..."

# Try creating a session token using a different endpoint
session_response=$(curl -s -X POST \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  "https://api.clerk.com/v1/sign_in_tokens" \
  -d "{\"user_id\": \"$CLERK_LANDLORD_USER_ID\", \"expires_in_seconds\": 3600}")

SESSION_TOKEN=$(echo "$session_response" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)


if [ -z "$SESSION_TOKEN" ]; then
  echo "❌ Failed to create sign-in token"
  echo "$session_response"
  exit 1
else
  echo "✅ Successfully created sign-in token: $SESSION_TOKEN"
fi

# Fetch landlord (admin) user from Clerk
admin_json=$(curl -s -X GET \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  "https://api.clerk.com/v1/users/$CLERK_LANDLORD_USER_ID")

echo "Admin metadata check:"
curl -s -X GET \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  "https://api.clerk.com/v1/users/$CLERK_LANDLORD_USER_ID/metadata" | grep -o '"public":{[^}]*}'

# Check if the API call succeeded
if echo "$admin_json" | grep -q "error"; then
  echo "❌ Failed to retrieve admin from Clerk API."
  echo "$admin_json"
  echo "Using default admin values..."
  admin_db_id=100
  admin_first_name="Default"
  admin_last_name="Admin"
  admin_email="admin@example.com"
  admin_phone="+15551234000"
else
  # Parse landlord details (using grep for compatibility instead of jq)
  admin_db_id=$(echo "$admin_json" | grep -o '"db_id":[0-9]*' | head -1 | cut -d':' -f2)
  if [ -z "$admin_db_id" ]; then
    echo "⚠️ Admin user does not have a db_id in Clerk metadata. Using default ID 100."
    admin_db_id=100
  fi

  admin_first_name=$(echo "$admin_json" | grep -o '"first_name":"[^"]*"' | head -1 | cut -d'"' -f4)
  admin_last_name=$(echo "$admin_json" | grep -o '"last_name":"[^"]*"' | head -1 | cut -d'"' -f4)
  admin_email=$(echo "$admin_json" | grep -o '"email_address":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -z "$admin_email" ]; then
    # Try another way to find email if the first method failed
    admin_email=$(echo "$admin_json" | grep -o '"email_addresses":\[.*\]' | grep -o '"email_address":"[^"]*"' | head -1 | cut -d'"' -f4)
  fi
  admin_phone="+15551234000" # Default since phone might not be available

  echo "Admin information from Clerk:"
  echo "  DB ID: $admin_db_id"
  echo "  Name: $admin_first_name $admin_last_name"
  echo "  Email: $admin_email"
fi

# Number of records to create
NUM_RECORDS=10

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

# Define tenant data
TENANT_FIRST_NAMES="Sam Noah John Malik Rhyn JJ Yoon James Diego Carree"
TENANT_LAST_NAMES="Ogg Lewis Wilson Soon Ogg SchraderBachar Soon Dude Mora Chrome"
TENANT_CLERK_IDS="user_ogg user_lewis user_wilson user_soon user_ogg1 user_scharderbachar user_soon1 user_dude user_mora user_chrome"
TENANT_PHONES="+15551234001 +15551234002 +15551234003 +15551234004 +15551234005 +15551234006 +15551234007 +15551234008 +15551234009 +15551234010"

# Define apartment data
APARTMENT_UNIT_NUMBERS="104 208 215 336 182 160 134 240 260 320"
APARTMENT_PRICES="2000.00 1800.00 2223.00 1950.00 2150.00 2010.00 1900.00 2280.00 1975.00 2250.00"
APARTMENT_SIZES="850 800 900 825 875 874 860 854 810 910"

# Helper function to get an item from a space-separated list by index
get_item() {
  echo "$1" | cut -d' ' -f$2
}

# Helper function to extract only the number from PostgreSQL output
extract_id() {
  echo "$1" | grep -o '[0-9]\+' | head -1
}
make_api_call() {
  method=$1
  endpoint=$2
  data=$3

  echo "➡️ Calling $API_URL$endpoint"
  echo "📦 Payload: $data"
# AM I 100% on the endpoint path? And on the method that I hidding?
  response=$(curl -s -w "\n🔁 HTTP Status: %{http_code}\n" -X $method \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SESSION_TOKEN" \
    -d "$data" \
    "$API_URL$endpoint")
  echo $API_URL$endpoint
  echo "$response"
}


# Arrays to store IDs (using temporary files for BusyBox compatibility)
TENANT_IDS_FILE=$(mktemp)
APARTMENT_IDS_FILE=$(mktemp)
LEASE_IDS_FILE=$(mktemp)

# Step 1: Create admin user with ID from Clerk (using OVERRIDING SYSTEM VALUE)
echo "Step 1: Creating admin user with ID $admin_db_id..."

# First check if user with the specified ID already exists
USER_EXISTS=$(psql -h $PG_HOST -U $PG_USER -d $PG_DB -t -c "SELECT COUNT(*) FROM users WHERE id = $admin_db_id;")
USER_EXISTS=$(extract_id "$USER_EXISTS")

if [ "$USER_EXISTS" -eq "0" ]; then
  # Create the admin user with specified ID using the correct OVERRIDING SYSTEM VALUE syntax
  psql -h $PG_HOST -U $PG_USER -d $PG_DB -c "
  -- Delete existing user with the same clerk_id if it exists
  DELETE FROM users WHERE clerk_id = '$CLERK_LANDLORD_USER_ID';
  
  -- Create the admin user with the specified ID
  INSERT INTO users (id, clerk_id, first_name, last_name, email, phone, role, status) 
  OVERRIDING SYSTEM VALUE
  VALUES ($admin_db_id, '$CLERK_LANDLORD_USER_ID', '$admin_first_name', '$admin_last_name', '$admin_email', '$admin_phone', 'admin', 'active');
  "
  echo "Created admin user with ID: $admin_db_id"
else
  echo "Admin user with ID $admin_db_id already exists"
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
  
  # Skip if email matches admin email
  if [ "$EMAIL" = "$admin_email" ]; then
    echo "Skipping tenant with email $EMAIL because it matches admin email."
    continue
  fi
  
  # First delete any existing user with the same clerk_id
  psql -h $PG_HOST -U $PG_USER -d $PG_DB -c "DELETE FROM users WHERE clerk_id = '$TENANT_CLERK_ID';"
  
  # Create tenant user
  TENANT_SQL="INSERT INTO users (clerk_id, first_name, last_name, email, phone, role, status) 
             VALUES ('$TENANT_CLERK_ID', '$TENANT_FIRST_NAME', '$TENANT_LAST_NAME', '$EMAIL', '$TENANT_PHONE', 'tenant', 'active') 
             RETURNING id;"
  
  TENANT_ID_RAW=$(psql -h $PG_HOST -U $PG_USER -d $PG_DB -t -c "$TENANT_SQL")
  TENANT_ID=$(extract_id "$TENANT_ID_RAW")
  
  # Verify that the tenant ID is not the same as the admin ID
  if [ "$TENANT_ID" -eq "$admin_db_id" ]; then
    echo "WARNING: Tenant ID conflicts with admin ID. This should not happen with SERIAL/IDENTITY columns."
    echo "Attempting to reassign tenant ID..."
    
    # Delete the tenant and try again with explicit ID assignment
    psql -h $PG_HOST -U $PG_USER -d $PG_DB -c "DELETE FROM users WHERE id = $TENANT_ID;"
    
    # Find a new ID that's not the admin ID (admin ID + 1000 to be safe)
    NEW_ID=$((admin_db_id + 1000 + i))
    
    TENANT_SQL="INSERT INTO users (id, clerk_id, first_name, last_name, email, phone, role, status) 
               OVERRIDING SYSTEM VALUE
               VALUES ($NEW_ID, '$TENANT_CLERK_ID', '$TENANT_FIRST_NAME', '$TENANT_LAST_NAME', '$EMAIL', '$TENANT_PHONE', 'tenant', 'active') 
               RETURNING id;"
    
    TENANT_ID_RAW=$(psql -h $PG_HOST -U $PG_USER -d $PG_DB -t -c "$TENANT_SQL")
    TENANT_ID=$(extract_id "$TENANT_ID_RAW")
  fi
  
  echo "Created tenant #$i: $TENANT_FIRST_NAME $TENANT_LAST_NAME (ID: $TENANT_ID)"
  
  # Store ID for later use
  echo "$TENANT_ID" >> $TENANT_IDS_FILE
done
echo "✅ Created tenants"

# Create apartments
echo "Step 3: Creating apartments..."
for i in $(seq 1 $NUM_RECORDS); do
  APARTMENT_UNIT_NUMBER=$(get_item "$APARTMENT_UNIT_NUMBERS" $i)
  APARTMENT_PRICE=$(get_item "$APARTMENT_PRICES" $i)
  APARTMENT_SIZE=$(get_item "$APARTMENT_SIZES" $i)
  
  # First delete any existing apartment with the same unit number
  psql -h $PG_HOST -U $PG_USER -d $PG_DB -c "DELETE FROM apartments WHERE unit_number = $APARTMENT_UNIT_NUMBER;"
  
  APT_SQL="INSERT INTO apartments (unit_number, price, size, management_id, availability) 
          VALUES ($APARTMENT_UNIT_NUMBER, $APARTMENT_PRICE, $APARTMENT_SIZE, $admin_db_id, true) 
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
for i in $(seq 1 $(($NUM_RECORDS - 5))); do
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
  
  LEASE_PAYLOAD="{\"tenant_id\":$TENANT_ID,\"landlord_id\":$admin_db_id,\"apartment_id\":$APT_ID,\"start_date\":\"$TODAY\",\"end_date\":\"$ONE_YEAR\",\"rent_amount\":$APARTMENT_PRICE,\"lease_status\":\"draft\",\"document_title\":\"Residential Lease Agreement - Unit $APARTMENT_NUMBER\",\"lease_number\":1,\"created_by\":$admin_db_id,\"updated_by\":$admin_db_id,\"tenant_name\":\"$TENANT_NAME\",\"tenant_email\":\"$EMAIL\",\"property_address\":\"123 Main Street, Apartment $APARTMENT_NUMBER\",\"replace_existing\":true}"

# Call API to create the lease with authentication
echo "Sending API request to create lease..."
LEASE_RESPONSE=$(make_api_call "POST" "/admin/leases/create" "$LEASE_PAYLOAD")

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
    echo "$LEASE_ID" >> $LEASE_IDS_FILE
  else
    echo "  ❌ Failed to create lease. Response: $LEASE_RESPONSE"
    echo "    This could be due to authentication issues or API constraints."
    echo "    You may need to manually create this lease through the UI."
  fi
  
  echo "----------------------------------------"
  sleep 2
done

# Step 5: Test fetching Documenso URLs for all created leases
echo "Step 5: Testing DocumensoGetDocumentURL endpoint..."
for i in $(seq 1 $NUM_RECORDS); do
  LEASE_ID_RAW=$(sed -n "${i}p" $LEASE_IDS_FILE 2>/dev/null)
  LEASE_ID=$(extract_id "$LEASE_ID_RAW")
  
  if [ ! -z "$LEASE_ID" ]; then
    echo "Testing Documenso URL retrieval for lease #$i (ID: $LEASE_ID)"
    
    DOC_URL_RESPONSE=$(make_api_call "GET" "/admin/leases/$LEASE_ID/url")
    
    if echo "$DOC_URL_RESPONSE" | grep -q '"download_url":'; then
      echo "  ✅ Successfully retrieved Documenso URL"
      echo "  Response: $DOC_URL_RESPONSE"
    else
      echo "  ❌ Failed to retrieve Documenso URL. Response: $DOC_URL_RESPONSE"
    fi
    
    echo "----------------------------------------"
  fi
  sleep 1
done

# Wait for user confirmation before testing URL retrieval
echo "Press Enter when you want to test URL retrieval for all created leases..."
read -p ">" CONFIRM_TEST

# Step 6: Test fetching URLs for all created leases
echo "Step 6: Testing URL retrieval endpoints..."
for i in $(seq 1 $NUM_RECORDS); do
  LEASE_ID_RAW=$(sed -n "${i}p" $LEASE_IDS_FILE 2>/dev/null)
  LEASE_ID=$(extract_id "$LEASE_ID_RAW")
  
  if [ ! -z "$LEASE_ID" ]; then
    echo "Testing URL retrieval for lease #$i (ID: $LEASE_ID)"
    
    URL_RESPONSE=$(make_api_call "GET" "/admin/leases/$LEASE_ID/url")
    
    if echo "$URL_RESPONSE" | grep -q '"download_url":'; then
      echo "  ✅ Successfully retrieved S3 URL"
      echo "  Response: $URL_RESPONSE"
    else
      echo "  ❌ Failed to retrieve URL. Response: $URL_RESPONSE"
    fi
    
    echo "----------------------------------------"
  fi
  sleep 1
done
# Clean up temporary files
rm -f $TENANT_IDS_FILE $APARTMENT_IDS_FILE $LEASE_IDS_FILE

echo "✅ Database seeding and testing completed!"
echo "You can now test your Documenso webhook integration."