![image](assets/logo.png)

# Ezra

EZRA is a modern apartment management platform written in Go. It
streamlines property management by offering a robust solution for tenant
management, maintenance tracking, lease management, and comprehensive reporting.
Designed for scalability and security, EZRA is ideal for property managers
looking to simplify their workflow.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Development](#development)
  - [Project Structure](#project-structure)
  - [Testing](#testing)
  - [Linting & Formatting](#linting--formatting)

## Features

- **Tenant Management:** Organize tenant details, lease agreements, and payment histories.
- **Maintenance Requests:** Efficiently handle repair and service requests.
- **Tennant Complaints**: Get notified when a tenant has a issue, keep track of
  them all in one place
- **User Roles & Permissions:** Customize access for Owners, property managers,
  and tenants.

## Getting Started

Follow these steps to set up the project on your local machine for development
or testing.

### Prerequisites

- **Go:** Version 1.16 or higher
- **Database:** PostgreSQL (or any supported SQL database)
- **Node.js:** Ensure you have Node.js installed.
- **NPM:** Ensure you have NPM installed.
- **Docker**: Ensure you have docker and docker-compose installed.
- **SMTP Server**: A functional SMTP server

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/Team-Rent-Daddy/RentDaddy/ EZRA
   cd EZRA
   ```

2. **Install Dependencies**

   2a. **Frontend**

   ```bash
   cd frontend/app
   npm i
   ```

   2b. **Backend**

   With Go modules enabled, download all required dependencies:

   ```bash
   cd backend
   go mod download
   ```

3. **Set Up the Database**

   Update your database settings in the configuration file (see [Configuration](#configuration)).

4. **Run Migrations**

   If using a migration tool (e.g., [migrate](https://github.com/golang-migrate/migrate)):

   ```bash
   migrate -path ./migrations -database "$DATABASE_URL" up
   ```

## Configuration

Create a `.env` file in the project root to manage environment-specific
variables. The simplest method to do so is running the command below:

```bash
cp .env.example .env
```

And then edit it using your favorite text editor.

Here is a bit more information regarding SMTP setup and functionality: [SMTP
README](./backend/internal/smtp/SMTP_README.md)

> **Note:** Replace the placeholder values with your actual configuration.

### Administrator Setup

The system requires at least one administrator account to function properly. The application will automatically handle admin setup in the following way:

1. When a user signs in through Clerk, the frontend will check if any admin exists in the database
2. If no admin user exists, the first user to sign in will be automatically designated as an admin
3. This process happens automatically during application initialization

For local development:

1. Ensure Clerk authentication is properly configured with your API keys
2. Make sure the backend is running and connected to the database
3. Sign in with your Clerk account - the first user to sign in will become the admin automatically
4. This admin user will have full access to all system features, including Documenso configuration

**Environment Variables:**
- `ADMIN_FIRST_NAME` and `ADMIN_LAST_NAME`: Optional - if set, they'll be used to match specific users as admins
- `CLERK_WEBHOOK`: Required - the Clerk webhook signing secret for authenticating webhook requests

**Troubleshooting:**
- If you need to manually set up an admin user, you can use the `/setup/admin` endpoint:
  ```bash
  curl -X POST http://localhost:8080/setup/admin \
    -H "Content-Type: application/json" \
    -d '{"clerk_id": "YOUR_CLERK_USER_ID"}'
  ```
- To check if an admin exists in the system, use the `/check-admin` endpoint:
  ```bash
  curl http://localhost:8080/check-admin
  ```

## Usage

### Running the Application

Start the application with:

```bash
go run main.go
```

### Using Docker

Build and run using Docker:

```bash
docker build -t rentdaddy .
docker run -p 8080:8080 rentdaddy
```

Access the application by navigating to `http://localhost:8080`.

## Development

### Project Structure

Subject to change as needed

```bash
EZRA/
├── frontend/       # Vite/Tanstack/react frontend
├── backend/        # Go/SQL Backend
├── assets/         # Images, Icons, Logos, Etc
└── README.md       # Project documentation
```

### Testing

Run all tests with:

```bash
go test -v
```

### Linting & Formatting

- **Formatting:** Format your code with:

  ```bash
  gofmt -s -w .
  ```
