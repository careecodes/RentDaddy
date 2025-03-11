![image](assets/logo.png)

# RentDaddy

RentDaddy is a modern apartment management platform written in Go. It
streamlines property management by offering a robust solution for tenant
management, maintenance tracking, lease management, and comprehensive reporting.
Designed for scalability and security, RentDaddy is ideal for property managers
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

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/careecodes/RentDaddy.git
   cd RentDaddy
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
variables. Example:

```env
# Server Configuration
PORT=8080

# Database Configuration
DATABASE_URL=postgres://user:password@localhost:5432/rentdaddy?sslmode=disable

# Application Environment
ENV=development
```

> **Note:** Replace the placeholder values with your actual configuration.

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
RentDaddy/
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
