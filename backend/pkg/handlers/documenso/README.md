# 📄 Setting Up Self-hosted Documenso with AWS SES using Docker Compose

This updated README provides clear, step-by-step instructions to self-host **Documenso** using Docker Compose with the configuration and environment variables used by the RentDaddy team.

It covers:
- Required `.env` variables
- Docker Compose configuration
- SMTP setup using AWS SES
- AWS S3 file upload integration
- Webhook and API token setup for backend communication

---

## 🔠 Prerequisites
- Docker & Docker Compose installed
- AWS SES account with SMTP credentials.
- PostgreSQL database for Documenso
- AWS S3 bucket (if enabling file uploads)
- `compose.yml` file downloaded from Documenso repository

📌 Official Documenso Docker Compose File:  
[🔗 Documenso Compose File](https://raw.githubusercontent.com/documenso/documenso/release/docker/production/compose.yml)

---

📌 For a refresher on Docker and Docker Compose, please see [the Appendix](#appendix-docker--docker-compose-quick-reference)

## ===

## 1⃣ Download & Set Up Documenso Docker Compose

```bash
mkdir documenso-selfhosted && cd documenso-selfhosted
cp /path/to/your/docker-compose.yml ./docker-compose.yml
```
Please follow this guide for generating your cert.p12: https://docs.documenso.com/developers/local-development/signing-certificate

Also copy your `cert.p12` signing file into this directory.

---

## 2. Create the `.env` File

Use this template based on RentDaddy’s working configuration:

```ini
# Required Encryption & Secrets
NEXT_PRIVATE_GOOGLE_CLIENT_ID=""
NEXT_PRIVATE_GOOGLE_CLIENT_SECRET=""
NEXTAUTH_SECRET="<GENERATE_USING_OPENSSL>"
NEXT_PRIVATE_ENCRYPTION_KEY="<GENERATE_USING_OPENSSL>"
NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY="<GENERATE_USING_OPENSSL>"

# URLs
NEXT_PUBLIC_WEBAPP_URL="http://localhost:3000"
NEXT_PRIVATE_INTERNAL_WEBAPP_URL="http://documenso:3000"

# PostgreSQL
POSTGRES_USER=documenso
POSTGRES_PASSWORD=password
POSTGRES_DB=documenso
NEXT_PRIVATE_DATABASE_URL=postgresql://documenso:password@database:5432/documenso
NEXT_PRIVATE_DIRECT_DATABASE_URL=postgresql://documenso:password@database:5432/documenso

PORT=3000

# SMTP (Amazon SES Example)
NEXT_PRIVATE_SMTP_TRANSPORT="smtp-auth"
NEXT_PRIVATE_SMTP_HOST="email-smtp.us-east-1.amazonaws.com"
NEXT_PRIVATE_SMTP_PORT="587"
NEXT_PRIVATE_SMTP_USERNAME="To be provided by James for AWS SES"
NEXT_PRIVATE_SMTP_PASSWORD="To be provided by James for AWS SES"
NEXT_PRIVATE_SMTP_SECURE="false"
NEXT_PRIVATE_SMTP_FROM_NAME=""
NEXT_PRIVATE_SMTP_FROM_ADDRESS="To be provided by James for AWS SES (must be a verified sender)"

# S3 Uploads
NEXT_PUBLIC_UPLOAD_TRANSPORT=s3
NEXT_PRIVATE_UPLOAD_BUCKET=rentdaddydocumenso
NEXT_PRIVATE_UPLOAD_ENDPOINT="https://s3.us-east-1.amazonaws.com"
NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE=false
NEXT_PRIVATE_UPLOAD_REGION=us-east-1
NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID="To be provided by Reem for S3 Bucket"
NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY="To be provided by Reem for S3 Bucket"
```

### Generate secure values
```bash
openssl rand -hex 32  # For NEXTAUTH_SECRET
openssl rand -base64 32  # For encryption keys
```

---

## 3. Generate Certificate for Signing Documents

Documenso requires a `.p12` certificate to sign and encrypt documents. Here's how to generate it:

```bash
# Generate private key and self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout private.key -out certificate.crt -days 365 -nodes

# Convert to PKCS#12 format (.p12)
openssl pkcs12 -export -out cert.p12 -inkey private.key -in certificate.crt
```
Leave the export password blank if not needed.

Place the `cert.p12` file in the same directory as your docker-compose.yml.

Update volume binding in your docker-compose to:
```yaml
volumes:
  - ./cert.p12:/opt/documenso/cert.p12
```

---

## 4. Docker Compose Configuration

### Optional: Exposing Webhooks with ngrok
If you're self-hosting **both Documenso and your backend** inside Docker and both are on the same Docker network (`documenso-rentdaddy`), then **you do not need ngrok** for Documenso webhooks to reach your backend. You can configure the webhook like so:

```http
http://rentdaddy-backend:8080/webhooks/documenso
```

However, if:
- You are accessing Documenso from your browser at `localhost:3000`
- And Documenso needs to send webhooks to your backend which is not exposed to the public internet

Then you **will need ngrok** to tunnel external access to your local backend.

Here’s how to set it up:

### Ngrok Docker Service Example
```yaml
ngrok:
  image: ngrok/ngrok:latest
  container_name: ngrok-tunnel
  restart: unless-stopped
  environment:
    - NGROK_AUTHTOKEN=${NGROK_AUTHTOKEN}
  command: http rentdaddy-backend:${PORT:-8080}
  depends_on:
    - backend
  networks:
    - app-network
```

### How to Get an NGROK_AUTHTOKEN
1. Sign up at https://ngrok.com/
2. After logging in, go to your dashboard: https://dashboard.ngrok.com/get-started/setup
3. Copy your personal authtoken
4. Add it to your `.env` file like so:

```ini
NGROK_AUTHTOKEN=your-token-here
```

Use the public forwarding URL from ngrok in your Documenso webhook configuration.

### Why This Setup Matters

To enable seamless communication between the `rentdaddy-backend` and Documenso containers, both services are connected to a **shared Docker network**: `documenso-rentdaddy`. This allows:
- The backend to call Documenso’s API using `http://documenso:3000`
- Webhooks from Documenso to reach the backend when using ngrok

We updated the RentDaddy `docker-compose.yml` to include `documenso-rentdaddy` under the `backend` service:

```yaml
networks:
  app-network:
    driver: bridge
  documenso-rentdaddy:
    external: true
```

And added this to the backend service:

```yaml
networks:
  - app-network
  - documenso-rentdaddy
```

Additionally, we use **ngrok** to expose the backend locally for receiving Documenso webhook events. Here's the ngrok service block:

```yaml
ngrok:
  image: ngrok/ngrok:latest
  container_name: ngrok-tunnel
  restart: unless-stopped
  environment:
    - NGROK_AUTHTOKEN=${NGROK_AUTHTOKEN}
  command: http rentdaddy-backend:${PORT:-8080}
  depends_on:
    - backend
  networks:
    - app-network
```

Make sure to export the `NGROK_AUTHTOKEN` in your `.env` to authenticate your ngrok session.

### How to Get an NGROK_AUTHTOKEN
1. Sign up at https://ngrok.com/
2. After logging in, go to your dashboard: https://dashboard.ngrok.com/get-started/setup
3. Copy your personal authtoken
4. Add it to your `.env` file like so:

```ini
NGROK_AUTHTOKEN=your-token-here
```

This is required for authenticated ngrok tunnels to stay online.


Below is the full `docker-compose.yml` used to run Documenso in this setup:

```yaml
name: documenso-production

services:
  database:
    image: postgres:15
    environment:
      - POSTGRES_USER=${POSTGRES_USER:?err}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:?err}
      - POSTGRES_DB=${POSTGRES_DB:?err}
      - HOST=0.0.0.0
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER}']
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - database:/var/lib/postgresql/data

  documenso:
    image: documenso/documenso:latest
    depends_on:
      database:
        condition: service_healthy
    environment:
      - PORT=${PORT:-3000}
      - NEXT_PRIVATE_INTERNAL_WEBAPP_URL=http://documenso:3000
      - NEXTAUTH_URL=${NEXTAUTH_URL:-${NEXT_PUBLIC_WEBAPP_URL}}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET:?err}
      - NEXT_PRIVATE_ENCRYPTION_KEY=${NEXT_PRIVATE_ENCRYPTION_KEY:?err}
      - NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY=${NEXT_PRIVATE_ENCRYPTION_SECONDARY_KEY:?err}
      - NEXT_PRIVATE_GOOGLE_CLIENT_ID=${NEXT_PRIVATE_GOOGLE_CLIENT_ID}
      - NEXT_PRIVATE_GOOGLE_CLIENT_SECRET=${NEXT_PRIVATE_GOOGLE_CLIENT_SECRET}
      - NEXT_PUBLIC_WEBAPP_URL=${NEXT_PUBLIC_WEBAPP_URL:?err}
      - NEXT_PUBLIC_MARKETING_URL=${NEXT_PUBLIC_MARKETING_URL:-https://documenso.com}
      - NEXT_PRIVATE_DATABASE_URL=${NEXT_PRIVATE_DATABASE_URL:?err}
      - NEXT_PRIVATE_DIRECT_DATABASE_URL=${NEXT_PRIVATE_DIRECT_DATABASE_URL:-${NEXT_PRIVATE_DATABASE_URL}}
      - NEXT_PUBLIC_UPLOAD_TRANSPORT=${NEXT_PUBLIC_UPLOAD_TRANSPORT:-database}
      - NEXT_PRIVATE_UPLOAD_ENDPOINT=${NEXT_PRIVATE_UPLOAD_ENDPOINT}
      - NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE=${NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE}
      - NEXT_PRIVATE_UPLOAD_REGION=${NEXT_PRIVATE_UPLOAD_REGION}
      - NEXT_PRIVATE_UPLOAD_BUCKET=${NEXT_PRIVATE_UPLOAD_BUCKET}
      - NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID=${NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID}
      - NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY=${NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY}
      - NEXT_PRIVATE_SMTP_TRANSPORT=${NEXT_PRIVATE_SMTP_TRANSPORT:?err}
      - NEXT_PRIVATE_SMTP_HOST=${NEXT_PRIVATE_SMTP_HOST}
      - NEXT_PRIVATE_SMTP_PORT=${NEXT_PRIVATE_SMTP_PORT}
      - NEXT_PRIVATE_SMTP_USERNAME=${NEXT_PRIVATE_SMTP_USERNAME}
      - NEXT_PRIVATE_SMTP_PASSWORD=${NEXT_PRIVATE_SMTP_PASSWORD}
      - NEXT_PRIVATE_SMTP_APIKEY_USER=${NEXT_PRIVATE_SMTP_APIKEY_USER}
      - NEXT_PRIVATE_SMTP_APIKEY=${NEXT_PRIVATE_SMTP_APIKEY}
      - NEXT_PRIVATE_SMTP_SECURE=${NEXT_PRIVATE_SMTP_SECURE}
      - NEXT_PRIVATE_SMTP_FROM_NAME=${NEXT_PRIVATE_SMTP_FROM_NAME:?err}
      - NEXT_PRIVATE_SMTP_FROM_ADDRESS=${NEXT_PRIVATE_SMTP_FROM_ADDRESS:?err}
      - NEXT_PRIVATE_SMTP_SERVICE=${NEXT_PRIVATE_SMTP_SERVICE}
      - NEXT_PRIVATE_RESEND_API_KEY=${NEXT_PRIVATE_RESEND_API_KEY}
      - NEXT_PRIVATE_MAILCHANNELS_API_KEY=${NEXT_PRIVATE_MAILCHANNELS_API_KEY}
      - NEXT_PRIVATE_MAILCHANNELS_ENDPOINT=${NEXT_PRIVATE_MAILCHANNELS_ENDPOINT}
      - NEXT_PRIVATE_MAILCHANNELS_DKIM_DOMAIN=${NEXT_PRIVATE_MAILCHANNELS_DKIM_DOMAIN}
      - NEXT_PRIVATE_MAILCHANNELS_DKIM_SELECTOR=${NEXT_PRIVATE_MAILCHANNELS_DKIM_SELECTOR}
      - NEXT_PRIVATE_MAILCHANNELS_DKIM_PRIVATE_KEY=${NEXT_PRIVATE_MAILCHANNELS_DKIM_PRIVATE_KEY}
      - NEXT_PUBLIC_DOCUMENT_SIZE_UPLOAD_LIMIT=${NEXT_PUBLIC_DOCUMENT_SIZE_UPLOAD_LIMIT}
      - NEXT_PUBLIC_POSTHOG_KEY=${NEXT_PUBLIC_POSTHOG_KEY}
      - NEXT_PUBLIC_DISABLE_SIGNUP=${NEXT_PUBLIC_DISABLE_SIGNUP}
      - NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH=${NEXT_PRIVATE_SIGNING_LOCAL_FILE_PATH:-/opt/documenso/cert.p12}
      - NEXT_PRIVATE_SIGNING_PASSPHRASE=${NEXT_PRIVATE_SIGNING_PASSPHRASE}
    ports:
      - "3000:3000"
    volumes:
      - ./cert.p12:/opt/documenso/cert.p12
    networks:
      - default
      - documenso-rentdaddy

volumes:
  database:

networks:
  default:
    driver: bridge
  documenso-rentdaddy:
    external: true
```

Make sure your Docker network exists:

```bash
docker network create documenso-rentdaddy
```

---

## 4. Start the App

```bash
docker-compose --env-file .env up -d
```

### Monitor logs:
```bash
docker-compose logs -f documenso
```

You should see logs confirming signup confirmation emails or signature job queues.

---

## 5. Access Documenso UI

Visit [http://localhost:3000](http://localhost:3000) to sign up and test login and email verification.

---

## 6. Webhooks + API Integration

The Documenso API token and webhook secret must be manually set up. This is a deliberate design choice for security and reliability, as these are sensitive credentials that should be carefully managed.

Follow these steps to set up the required API tokens and webhooks:

From the Documenso web UI running locally:
- Go to **User Settings → Webhooks**
![alt text](<CleanShot 2025-03-23 at 00.01.01@2x.png>)
- Configure a webhook:
  - URL: `http://rentdaddy-backend:8080/webhooks/documenso` (or your backend URL)
  - Triggers: `document.signed`
  - Secret: Generate with `openssl rand -hex 32` or another method
![alt text](<CleanShot 2025-03-23 at 00.01.36@2x.png>)
- Copy the webhook secret

Also:
- Go to **User Settings → API Tokens**
- Generate a new API token named "RentDaddy Backend"
- Copy the API token value immediately (it's shown only once)

Add these values to your backend environment:

```ini
# RentDaddy project .env
DOCUMENSO_HOST=host.docker.internal
DOCUMENSO_PORT=3000
DOCUMENSO_API_URL="http://${DOCUMENSO_HOST}:${DOCUMENSO_PORT}"
DOCUMENSO_API_KEY="<PASTE_FROM_DOCUMENSO>"
DOCUMENSO_WEBHOOK_SECRET="<PASTE_FROM_DOCUMENSO>"
```

With either method, your backend can:
- Send leases via the API
- Receive webhook events like `document.signed.completed`

---

## 7. Setting Up API Tokens and Webhooks in AWS Deployment

For AWS deployments, you'll need to manually set up the API token and webhook secret. Here's how to do it securely:

1. **Obtain API Token and Webhook Secret:**
   - Complete the steps in section 6 to create a token and webhook
   - Copy the API token (visible only once upon creation)
   - Copy the webhook secret (by clicking "Show Secret")

2. **Store in AWS Secrets Manager:**
   ```bash
   # Store API token
   aws secretsmanager create-secret \
     --name documenso/api_token \
     --secret-string "your-api-token-value"
   
   # Store webhook secret
   aws secretsmanager create-secret \
     --name documenso/webhook_secret \
     --secret-string "your-webhook-secret-value"
   ```

3. **Update ECS Task Definition:**
   In your ECS task definition, reference these secrets:
   ```json
   "secrets": [
     {
       "name": "DOCUMENSO_API_KEY",
       "valueFrom": "arn:aws:secretsmanager:region:account-id:secret:documenso/api_token"
     },
     {
       "name": "DOCUMENSO_WEBHOOK_SECRET",
       "valueFrom": "arn:aws:secretsmanager:region:account-id:secret:documenso/webhook_secret"
     }
   ]
   ```

4. **For Local Testing:**
   Add to your `.env` file:
   ```
   DOCUMENSO_API_KEY=your-api-token-value
   DOCUMENSO_WEBHOOK_SECRET=your-webhook-secret-value
   ```

## 8. Final Checklist

- [ ] `.env` values match actual AWS / Documenso settings
- [ ] SMTP verified domain is in production (not sandbox)
- [ ] S3 credentials have full read/write to the bucket
- [ ] Webhook and API tokens manually created in Documenso UI
- [ ] API tokens and webhook secrets stored in AWS Secrets Manager
- [ ] Docker network created: `documenso-rentdaddy`
- [ ] Self-signed cert (`cert.p12`) generated and mounted

---

## SMTP Troubleshooting

If signup confirmation fails:
- Check logs: `docker-compose logs -f documenso`
- Look for errors like:
  - `Invalid login`
  - `550 This domain is not associated with your account`
- Try Forgot Password to force an email

See [SMTP_README.md](./../../../internal/smtp/SMTP_README.md) for full troubleshooting flow.
 for full troubleshooting flow.

---

## Questions?
- GitHub: https://github.com/documenso/documenso
- Docs: https://docs.documenso.com
- Discord: https://documen.so/discord


## Appendix: Docker & Docker Compose Quick Reference

If you're new to Docker or need a refresher, this section outlines common Docker commands used throughout this guide.

---

### Starting Services

Start all services defined in `docker-compose.yml`:

```bash
docker-compose --env-file .env up -d
```

The `-d` flag runs containers in detached mode (in the background).

---

### Stopping Services

Stop and remove all containers:

```bash
docker-compose down
```

To also remove named volumes (e.g., to reset the database):

```bash
docker-compose down -v
```

> ⚠️ Use this with caution — `-v` deletes volumes and erases data such as your PostgreSQL contents.

---

### Viewing Logs

Tail logs for the `documenso` service:

```bash
docker-compose logs -f documenso
```

Or for the backend:

```bash
docker-compose logs -f backend
```

---

### Executing Commands Inside a Container

To access a shell inside a running container:

```bash
docker exec -it <container_name> /bin/sh
```

Or for bash-based containers:

```bash
docker exec -it <container_name> /bin/bash
```

To find running containers:

```bash
docker ps
```

#### Example container names:

| Service   | Container Name                    |
|-----------|-----------------------------------|
| Documenso | `documenso-production-documenso-1` |
| Backend   | `rentdaddy-backend`               |

#### Example usage:

```bash
docker exec -it documenso-production-documenso-1 /bin/sh
docker exec -it rentdaddy-backend /bin/sh
```

Once inside the container, you can run shell commands like inspecting logs, `curl` requests, or testing DB/API connectivity.

---

### Accessing PostgreSQL from Backend Container

After exec-ing into `rentdaddy-backend`, connect to the PostgreSQL database:

```bash
psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -h ${POSTGRES_HOST}
```

If using hardcoded values:

```bash
psql -U appuser -d appdb -h postgres
```

> Replace with actual values from your `.env` file or container environment.

---

### Rebuilding Images

Rebuild all images:

```bash
docker-compose build
```

Rebuild only the backend:

```bash
docker-compose build backend
```

Then restart:

```bash
docker-compose up -d
```

---
