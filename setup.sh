#!/bin/bash
# setup.sh - Initialize project structure and files

echo "Setting execute permissions for entrypoint.sh..."
chmod +x backend/entrypoint.sh
echo "Permissions set!"
# # Create necessary directories
# mkdir -p docker/postgres/init
# mkdir -p backend/internal/db/queries
# mkdir -p backend/internal/db/generated
# mkdir -p frontend/app/src

# # Create .env file if it doesn't exist
# if [ ! -f .env ]; then
#     echo "Creating .env file..."
#     cat > .env << EOF
# # Server Configuration
# PORT=8080

# # Database Configuration
# POSTGRES_USER=appuser
# POSTGRES_PASSWORD=apppassword
# POSTGRES_DB=appdb
# POSTGRES_PORT=5432

# # Frontend Configuration
# FRONTEND_PORT=5173

# # Application Environment
# ENV=development
# EOF
#     echo ".env file created."
# fi

# # Create basic schema.sql if it doesn't exist
# if [ ! -f backend/internal/db/queries/schema.sql ]; then
#     echo "Creating initial schema.sql..."
#     cat > backend/internal/db/queries/schema.sql << EOF
# -- This schema is for PostgreSQL database initialization.
# CREATE TABLE tenants (
#   id SERIAL PRIMARY KEY,
#   name TEXT NOT NULL,
#   email TEXT NOT NULL,
#   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
# );
# EOF
#     echo "schema.sql created."
# fi

# # Create basic queries.sql if it doesn't exist
# if [ ! -f backend/internal/db/queries/queries.sql ]; then
#     echo "Creating initial queries.sql..."
#     cat > backend/internal/db/queries/queries.sql << EOF
# -- name: CreateTenant :one
# INSERT INTO tenants (
#   name,
#   email
# ) VALUES (
#   :name, :email
# ) RETURNING id, name, email, created_at;

# -- name: GetTenantByID :one
# SELECT id, name, email, created_at
# FROM tenants
# WHERE id = :id;

# -- name: GetTenants :many
# SELECT id, name, email, created_at
# FROM tenants
# ORDER BY created_at DESC
# LIMIT :limit OFFSET :offset;

# -- name: DeleteTenant :exec
# DELETE FROM tenants
# WHERE id = :id;
# EOF
#     echo "queries.sql created."
# fi

# # Create minimal go.mod if it doesn't exist
# if [ ! -f backend/go.mod ]; then
#     echo "Creating initial go.mod..."
#     cat > backend/go.mod << EOF
# module github.com/careecodes/RentDaddy/backend

# go 1.21
# EOF
#     echo "go.mod created."
# fi

# # Create minimal server.go if it doesn't exist
# if [ ! -f backend/server.go ]; then
#     echo "Creating initial server.go..."
#     cat > backend/server.go << EOF
# package main

# import (
# 	"fmt"
# 	"log"
# 	"net/http"
# 	"os"
# )

# func main() {
# 	port := os.Getenv("PORT")
# 	if port == "" {
# 		port = "8080"
# 	}

# 	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
# 		fmt.Fprintf(w, "Welcome to RentDaddy API")
# 	})

# 	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
# 		fmt.Fprintf(w, "OK")
# 	})

# 	log.Printf("Server starting on port %s", port)
# 	if err := http.ListenAndServe(":"+port, nil); err != nil {
# 		log.Fatalf("Server failed to start: %v", err)
# 	}
# }
# EOF
#     echo "server.go created."
# fi

# # Create minimal sqlc.yaml if it doesn't exist
# if [ ! -f backend/sqlc.yaml ]; then
#     echo "Creating initial sqlc.yaml..."
#     cat > backend/sqlc.yaml << EOF
# version: "2"
# sql:
#   - engine: "postgresql"
#     queries: "internal/db/queries"
#     schema: "internal/db/queries/schema.sql"
#     gen:
#       go:
#         package: "generated"
#         out: "internal/db/generated"
#         sql_package: "database/sql"
# EOF
#     echo "sqlc.yaml created."
# fi

# # Create minimal package.json for frontend if it doesn't exist
# if [ ! -f frontend/app/package.json ]; then
#     echo "Creating initial package.json..."
#     cat > frontend/app/package.json << EOF
# {
#   "name": "rentdaddy-frontend",
#   "private": true,
#   "version": "0.1.0",
#   "type": "module",
#   "scripts": {
#     "dev": "echo 'Frontend placeholder - replace with your actual frontend code'"
#   }
# }
# EOF
#     echo "package.json created."
# fi

# echo "Setup complete. You can now run 'docker-compose up' to start the development environment."