# Seed Users with Clerk

This utility script handles creating users in the database by synchronizing with Clerk authentication,
and seeding additional data including lockers, work orders, and complaints.

## Features

1. **User Synchronization with Clerk**
   - Retrieves users from Clerk authentication service
   - Creates or updates users in the local database
   - Manages user metadata synchronization between Clerk and the database

2. **Admin User Management**
   - Creates or verifies admin users in the system
   - Prioritizes admin users based on provided email addresses

3. **Demo Tenant Creation**
   - Creates demo tenant users with random data if needed

4. **Data Seeding**
   - Creates lockers for each tenant user
   - Generates random work orders with different categories
   - Generates random complaints with different categories

## Environment Variables

- `CLERK_SECRET_KEY` (required): Secret key for Clerk API authentication
- `ADMIN_EMAIL`: Email address for the primary admin user (falls back to SMTP_FROM)
- `ADMIN_FIRST_NAME`: First name for admin user
- `ADMIN_LAST_NAME`: Last name for admin user
- `ADMIN_CLERK_ID`: Clerk ID for admin user (optional, will try to find by email)
- `SCRIPT_MODE`: Set to "true" when running in script/task context without user authentication
- `PG_URL`: PostgreSQL connection string

## Usage

### Standard mode:
```
CLERK_SECRET_KEY=sk_test_xyz ADMIN_EMAIL=admin@example.com go run scripts/cmd/seed_users_with_clerk/main.go scripts/cmd/seed_users_with_clerk/seed_users.go
```

### Script mode:
```
CLERK_SECRET_KEY=sk_test_xyz ADMIN_EMAIL=admin@example.com SCRIPT_MODE=true go run scripts/cmd/seed_users_with_clerk/main.go scripts/cmd/seed_users_with_clerk/seed_users.go
```

## Implementation Notes

The script uses the Clerk API to synchronize user data and then leverages the internal utils.SeedDB function to create lockers, work orders, and complaints for these users. This ensures that after running this script, the system has both properly authenticated users and sample data for demonstration purposes.