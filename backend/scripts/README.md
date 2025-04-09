# RentDaddy Backend Scripts

This directory contains scripts for development, testing, and maintenance of the RentDaddy backend.

## Build Scripts

### build-seed-users.sh
Build standalone binary for seeding users, with or without Clerk authentication.

Usage:
```bash
./build-seed-users.sh [--with-clerk]
```

Options:
- `--with-clerk` - Build with Clerk authentication support

## Execution Scripts

### run-seed-users.sh
Run seed users script with or without Clerk authentication.

Usage:
```bash
./run-seed-users.sh [--with-clerk]
```

Options:
- `--with-clerk` - Seed users with Clerk authentication

### generate-cron-token.sh
Generate a secure token for the cron job endpoint authentication.

Usage:
```bash
./generate-cron-token.sh
```

### simulate-cron.sh
Simulate cron job execution during local development.

Usage:
```bash
./simulate-cron.sh
```

## Testing Scripts

### test-all.sh
Run all tests in the project.

Usage:
```bash
./test-all.sh
```

### test-changed.sh
Run tests only for changed files since the last commit.

Usage:
```bash
./test-changed.sh
```

### test-lease-notify.sh
Test the lease expiration notification functionality.

Usage:
```bash
./test-lease-notify.sh
```

### lease-seed-database.sh
Seed the database with lease test data.

Usage:
```bash
./lease-seed-database.sh
```

### lease-status-test.sh
Test lease status transitions.

Usage:
```bash
./lease-status-test.sh
```

## Command Files

The `cmd` directory contains Go source code for various command-line utilities:

### cmd/complaintswork/
Go code for generating test data for complaints and work orders.

### cmd/cron/
Cron job configuration files.

### cmd/seed_users_data/
Go code for basic seed user data.

### cmd/seed_users_with_clerk/
Go code for seed users with Clerk authentication.

## Script Organization

The scripts in this directory follow these naming conventions:
- `build-*.sh` - Scripts for building Go binaries
- `run-*.sh` - Scripts for running commands
- `test-*.sh` - Scripts for testing functionality
- `*-seed-*.sh` - Scripts for seeding the database
- `generate-*.sh` - Scripts for generating files or data

## Prerequisites

Most scripts require the following tools:
- Go (1.19 or higher)
- PostgreSQL client tools
- Git (for test-changed.sh)

Each script will check for its specific requirements and provide guidance if they're missing.