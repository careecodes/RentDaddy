#!/bin/bash

# Script to set up Documenso for local development
# This script creates the necessary directories and certificate files for Documenso

# Ensure script is run from the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Create the documenso directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/docker/documenso"

# Check if the certificate already exists
if [ -f "$PROJECT_ROOT/docker/documenso/cert.p12" ]; then
    echo "Certificate already exists at $PROJECT_ROOT/docker/documenso/cert.p12"
    echo "If you want to create a new certificate, please delete the existing one first."
    echo "Command: rm $PROJECT_ROOT/docker/documenso/cert.p12"
    exit 0
fi

# Navigate to the documenso directory
cd "$PROJECT_ROOT/docker/documenso"

echo "Generating certificate for Documenso..."

# Generate private key
openssl genrsa -out private.key 2048

# Generate self-signed certificate
openssl req -new -x509 -key private.key -out certificate.crt -days 365 -subj "/CN=localhost"

# Create p12 certificate with teamezraapp as the passphrase
PASSPHRASE="teamezraapp"
openssl pkcs12 -export -out cert.p12 -inkey private.key -in certificate.crt -legacy -passout pass:$PASSPHRASE

# Set correct permissions
chmod 644 cert.p12

# Clean up temporary files
rm private.key certificate.crt

echo "Certificate created successfully at $PROJECT_ROOT/docker/documenso/cert.p12"
echo "Passphrase: $PASSPHRASE"
echo ""
echo "To start the application with Documenso and Ngrok, run:"
echo ""
echo "1. Get an Ngrok authtoken from https://dashboard.ngrok.com/get-started/your-authtoken"
echo "2. Run the application with:"
echo "   NGROK_AUTHTOKEN=your_token docker-compose up -d"
echo ""
echo "3. Access the Ngrok dashboard at http://localhost:4040 to get your public URL"
echo "4. Update this URL in your Clerk webhook settings and Documenso configuration"