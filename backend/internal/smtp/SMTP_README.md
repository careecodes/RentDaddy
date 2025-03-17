# General SMTP - Configuration & Troubleshooting Guide

This guide explains how to set up and manage your email alerts using environment variables. The system is designed for SMTP integration with Amazon SES, but any SMTP server using the same environment variables will work.

## 1. SMTP Setup & Authentication

### Environment Variables

To get your SMTP setup working, you must define the following environment variables:

- **SMTP_ENDPOINT_ADDRESS**: The SMTP server address (e.g., `email-smtp.us-east-2.amazonaws.com`).
- **SMTP_PORT**: The port to use (commonly `587` for starttls).
- **SMTP_USER**: The username for SMTP authentication.
- **SMTP_PASSWORD**: The password for SMTP authentication.
- **SMTP_TLS_MODE**: Either `starttls` or `tls`. Only these two modes are accepted.
- **SMTP_FROM**: The authorized sender email address.
- **SMTP_TEST_EMAIL**: A test recipient email used during testing.

### Security Configurations

- **TLS/StartTLS**: The system supports both `starttls` and direct `tls`. Choose the one that suits your server's security requirements.
- **Authentication Method**: Only username and password are used. Ensure that these credentials are stored securely.

## 2. Email Sending Process

### How It Works

- **System Integration**: Email alerts can be triggered by Documenso, Clerk, or the system itself. The emails are generated differently between the three.
- **Rate Limits**: Email sending limits depend on your SMTP provider. There’s no in-built cap; be mindful of your provider’s restrictions.

### Code Overview

The main code is structured in two parts:

- **SMTP Configuration Loading**:  
  The `LoadSMTPConfig` function reads the environment variables and ensures all necessary fields are set. If any variable is missing or the TLS mode is incorrect, it will return an error immediately.

- **Sending Emails**:  
  The `SendEmail` function constructs the email and uses Go's `net/smtp` package to send it. It employs a retry mechanism: if an email fails to send, it will retry up to three times with exponential backoff. If it still fails, the error gets logged for further investigation.

- **Testing the Setup**:  
  There are tests provided in the code to verify both the SMTP connection and email sending functionality. Set the `SMTP_TEST_EMAIL` environment variable to a valid address and run the tests. It’s a sanity check, and you should receive an email.

## 3. Error Handling

### Common Issues

- **Authentication Failures**:  
  If you see repeated authentication errors, double-check that your SMTP_FROM, SMTP_USER and SMTP_PASSWORD are correct and that the server accepts the provided credentials.

- **Retry Logic**:  
  If sending fails, the system automatically retries three times before logging the error.

### Logging

- Errors are logged in the backend. You need to monitor these logs for issues, especially during the initial setup.

## 4. Delivery Tracking

- **SMTP Response Codes**:  
  The system does not require explicit delivery confirmation. It relies on the SMTP error response codes (or lack thereof) during the send process.
- **Bounce Handling**:  
  Bounced emails are managed automatically by your SMTP provider. There’s no additional tracking built into the application. Please ensure the emails user give are real during clerk account creation.
- **No Read Receipts/Open Tracking**:  
  Documenso handles its own tracking. No other service needs it.

## 5. Troubleshooting & FAQs

### Common Issues

- **Setting up the Environment Variables**:  
  Make sure all required variables are set. Missing any of them will result in configuration errors.
- **Credential Updates**:  
  To update your SMTP credentials, an admin can change the settings on the apartment settings page or directly update the environment variables.

### Testing Email Functionality

- **Current Status**:  
  Testing email functionality in the UI isn’t fully fleshed out yet, but it’s on the roadmap. For now, rely on the provided tests to ensure your setup works as expected.

### When Things Go Wrong

- **Contact Support**:  
  If you run into issues that aren’t solved by checking your configuration or reviewing the logs, file an issue.
