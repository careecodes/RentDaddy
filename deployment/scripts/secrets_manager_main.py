#!/usr/bin/env python3
import os
import json
import subprocess
import sys

# Configuration
BACKEND_ENV_FILE = "../../backend/.env.production.local"
FRONTEND_ENV_FILE = "../../frontend/app/.env.production.local"
SECRET_ARN = "arn:aws:secretsmanager:us-east-2:168356498770:secret:rentdaddy/production/main-app-q09OoA"
TEMP_AWS_SECRETS_FILE = "/tmp/aws_secrets.json"

# Check if the local env files exist
if not os.path.isfile(BACKEND_ENV_FILE):
    print(f"Error: Backend environment file '{BACKEND_ENV_FILE}' not found.")
    sys.exit(1)

if not os.path.isfile(FRONTEND_ENV_FILE):
    print(f"Warning: Frontend environment file '{FRONTEND_ENV_FILE}' not found. Proceeding with backend only.")
    FRONTEND_ENV_FILE = None

# Parse env files
def parse_env_file(file_path):
    env_vars = {}
    with open(file_path, 'r') as file:
        for line in file:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, value = line.split('=', 1)
                env_vars[key] = value
    return env_vars

# Combine backend and frontend variables
local_secrets = {}
print("Loading backend environment variables...")
local_secrets.update(parse_env_file(BACKEND_ENV_FILE))

if FRONTEND_ENV_FILE and os.path.isfile(FRONTEND_ENV_FILE):
    print("Loading frontend environment variables...")
    frontend_vars = parse_env_file(FRONTEND_ENV_FILE)
    
    # Identify any conflicts (same key, different values)
    conflicts = []
    for key, value in frontend_vars.items():
        if key in local_secrets and local_secrets[key] != value:
            conflicts.append(key)
    
    if conflicts:
        print("\n⚠️ Conflicts detected between backend and frontend variables:")
        for key in conflicts:
            print(f"  {key}:")
            print(f"    Backend: {local_secrets[key]}")
            print(f"    Frontend: {frontend_vars[key]}")
        
        print("\nHow do you want to resolve these conflicts?")
        print("1. Prefer backend values")
        print("2. Prefer frontend values")
        print("3. Manual selection for each conflict")
        choice = input("Enter your choice (1-3): ")
        
        if choice == "1":
            # Backend values take precedence (already in local_secrets)
            # Just add non-conflicting frontend values
            for key, value in frontend_vars.items():
                if key not in local_secrets:
                    local_secrets[key] = value
        elif choice == "2":
            # Frontend values take precedence
            local_secrets.update(frontend_vars)
        elif choice == "3":
            # Manual selection
            for key in conflicts:
                print(f"\nConflict for {key}:")
                print(f"1. Backend: {local_secrets[key]}")
                print(f"2. Frontend: {frontend_vars[key]}")
                selection = input("Choose value (1/2): ")
                if selection == "2":
                    local_secrets[key] = frontend_vars[key]
        else:
            print("Invalid choice. Using backend values for conflicts.")
    else:
        # No conflicts, just update with frontend vars
        local_secrets.update(frontend_vars)

# Fetch secrets from AWS
print("\nFetching secrets from AWS Secrets Manager...")
try:
    aws_cmd = f"aws secretsmanager get-secret-value --secret-id {SECRET_ARN} --query SecretString --output text"
    aws_result = subprocess.check_output(aws_cmd, shell=True, text=True)
    aws_secrets = json.loads(aws_result)
except Exception as e:
    print(f"Error fetching AWS secrets: {e}")
    sys.exit(1)

# Compare secrets
print("\n=== COMPARISON RESULTS ===")

# Keys in both
print("\n=== KEYS IN BOTH ===")
both_keys = sorted(set(aws_secrets.keys()) & set(local_secrets.keys()))
for key in both_keys:
    print(key)

# Keys only in AWS
print("\n=== KEYS ONLY IN AWS SECRETS MANAGER ===")
aws_only = sorted(set(aws_secrets.keys()) - set(local_secrets.keys()))
for key in aws_only:
    print(key)

# Keys only in local
print("\n=== KEYS ONLY IN LOCAL ENV ===")
local_only = sorted(set(local_secrets.keys()) - set(aws_secrets.keys()))
for key in local_only:
    print(key)

# Check for value differences
print("\n=== VALUES THAT DIFFER ===")
for key in both_keys:
    if aws_secrets[key] != local_secrets[key]:
        print(f"{key}:")
        print(f"  AWS: {aws_secrets[key]}")
        print(f"  Local: {local_secrets[key]}")

# Ask for confirmation
confirmation = input("\nDo you want to update AWS Secrets Manager with your combined local values? (y/n): ")

if confirmation.lower() == 'y':
    print("Updating AWS Secrets Manager...")
    try:
        # Create a temporary file with the JSON data
        with open(TEMP_AWS_SECRETS_FILE, 'w') as f:
            json.dump(local_secrets, f)
        
        # Update AWS Secrets Manager
        update_cmd = f"aws secretsmanager put-secret-value --secret-id {SECRET_ARN} --secret-string file://{TEMP_AWS_SECRETS_FILE}"
        subprocess.run(update_cmd, shell=True, check=True)
        print("AWS Secrets Manager has been updated successfully.")
    except Exception as e:
        print(f"Error updating AWS secrets: {e}")
    finally:
        # Clean up
        if os.path.exists(TEMP_AWS_SECRETS_FILE):
            os.remove(TEMP_AWS_SECRETS_FILE)
else:
    print("Operation cancelled. No changes were made.")