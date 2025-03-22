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

## ===

## 1⃣ Download & Set Up Documenso Docker Compose

```bash
mkdir documenso-selfhosted && cd documenso-selfhosted
cp /path/to/your/docker-compose.yml ./docker-compose.yml
```

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

## 4. Docker Compose Notes

Ensure your `docker-compose.yml` matches the provided config. Notable points:
- Port 3000 is mapped.
- Certificate mounted at `./cert.p12:/opt/documenso/cert.p12`
- Uses custom Docker network `documenso-rentdaddy` (make sure it's created).

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

## 6. Enable Webhooks + API Integration

From the Documenso web UI:
- Go to **User Settings → Developer → Webhooks**
- Generate a `DOCUMENSO_WEBHOOK_SECRET`
- Copy and paste it into your RentDaddy `.env`

Also:
- Generate a `DOCUMENSO_API_KEY` (under API Tokens)
- Paste into `.env` of your Go backend:

```ini
# RentDaddy project .env
DOCUMENSO_HOST=host.docker.internal
DOCUMENSO_PORT=3000
DOCUMENSO_API_URL="http://${DOCUMENSO_HOST}:${DOCUMENSO_PORT}"
DOCUMENSO_API_KEY="<PASTE_FROM_DOCUMENSO>"
DOCUMENSO_WEBHOOK_SECRET="<PASTE_FROM_DOCUMENSO>"
```

Your Go backend can now:
- Send leases via the API
- Receive webhook events like `document.signed.completed`

---

## 7. Final Checklist

- [ ] `.env` values match actual AWS / Documenso settings
- [ ] SMTP verified domain is in production (not sandbox)
- [ ] S3 credentials have full read/write to the bucket
- [ ] Webhook and API tokens copied from UI
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

See `SMTP_README.md` for full troubleshooting flow.

---

## Questions?
- GitHub: https://github.com/documenso/documenso
- Docs: https://docs.documenso.com
- Discord: https://documen.so/discord

