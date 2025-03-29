#!/bin/bash

# Set file paths
ENV_FILE="../.env"
MAIN_OUTPUT="main-secrets.json"
DOCUMENSO_OUTPUT="documenso-secrets.json"

# Initialize empty JSON objects
echo "{" > $MAIN_OUTPUT
echo "{" > $DOCUMENSO_OUTPUT

# Counter to track if we need commas
main_count=0
documenso_count=0

# Current section (main or documenso)
current_section="main"

# Function to add a variable to a JSON file
add_to_json() {
  local file=$1
  local key=$2
  local value=$3
  local count_var=$4
  
  # Get the current count value indirectly
  local count=${!count_var}
  
  # Add comma if not the first entry
  if [ $count -gt 0 ]; then
    echo "," >> $file
  fi
  
  # Escape any double quotes in the value
  value=$(echo "$value" | sed 's/"/\\"/g')
  
  # Add the key-value pair
  echo "  \"$key\": \"$value\"" >> $file
  
  # Increment the counter
  eval "$count_var=$((count+1))"
}

# Process the .env file
while IFS= read -r line || [[ -n "$line" ]]; do
  # Check for demarcation lines
  if [[ "$line" == "# RENTDADDY_START" || "$line" == "# MAIN_START" ]]; then
    current_section="main"
    continue
  elif [[ "$line" == "# DOCUMENSO_START" ]]; then
    current_section="documenso"
    continue
  elif [[ "$line" == "# RENTDADDY_END" || "$line" == "# MAIN_END" || "$line" == "# DOCUMENSO_END" ]]; then
    current_section="none"
    continue
  fi
  
  # Skip empty lines and comments (except demarcation lines)
  if [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]]; then
    continue
  fi
  
  # Extract key and value
  if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    
    # Remove any leading/trailing whitespace
    key=$(echo "$key" | xargs)
    
    # Skip if key is empty or if value is empty
    if [[ -z "$key" ]]; then
      continue
    fi
    
    # Add to appropriate file based on current section
    if [[ "$current_section" == "main" ]]; then
      add_to_json "$MAIN_OUTPUT" "$key" "$value" "main_count"
    elif [[ "$current_section" == "documenso" ]]; then
      add_to_json "$DOCUMENSO_OUTPUT" "$key" "$value" "documenso_count"
    fi
  fi
done < "$ENV_FILE"

# Close the JSON files
echo -e "\n}" >> $MAIN_OUTPUT
echo -e "\n}" >> $DOCUMENSO_OUTPUT

# Generate AWS CLI commands
echo "# Command to update main application secrets:"
echo "aws secretsmanager update-secret --secret-id rentdaddy/production/main-app --secret-string file://$MAIN_OUTPUT"
echo ""
echo "# Command to update Documenso secrets:"
echo "aws secretsmanager update-secret --secret-id rentdaddy/production/documenso --secret-string file://$DOCUMENSO_OUTPUT"
echo ""
echo "# IMPORTANT: Remember to delete the JSON files after use for security"
echo "# rm $MAIN_OUTPUT $DOCUMENSO_OUTPUT"