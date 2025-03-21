FROM golang:1.23-alpine as builder

# Define a build-time argument for debug mode 
ENV DEBUG_MODE=${DEBUG_MODE}

# Copy application files
COPY . .
COPY go.mod go.sum ./
RUN go mod download
RUN go install github.com/go-delve/delve/cmd/dlv@latest

# Check if server.go exists and print directory contents
RUN ls -la
RUN if [ -f server.go ]; then echo "server.go exists"; else echo "server.go does not exist!"; fi



# Conditionally build the Go binary with or without debugging symbols
RUN if [ "$DEBUG_MODE" = "true" ]; then \
    # Install Delve debugger for debugging
    echo "Building with debugging enabled..."; \
    go build -gcflags "all=-N -l" -o /tmp/server . || (echo "BUILD FAILED!" && exit 1); \
    else \
    echo "Building in production mode..." || (echo "BUILD FAILED!" && exit 1); \
    go build -o /tmp/server .; \
    fi

FROM golang:1.23-alpine

# Set working directory
WORKDIR /app
COPY --from=builder /tmp/server /tmp/server
# Copy application files from builder stage to container
COPY . .

# Copy Delve from builder stage to final image

COPY --from=builder /go/bin/dlv /usr/local/bin/dlv

# Ensure Delve is executable
RUN chmod +x /usr/local/bin/dlv

# Install necessary tools using apk (for Alpine)
RUN apk update && apk add --no-cache curl git postgresql-client

# Install Task CLI manually
RUN curl -sL https://github.com/go-task/task/releases/download/v3.37.1/task_linux_amd64.tar.gz | tar -xz -C /usr/local/bin task
RUN chmod +x /usr/local/bin/task
RUN task --version

# Install golang-migrate
RUN wget -O migrate.tar.gz https://github.com/golang-migrate/migrate/releases/download/v4.18.2/migrate.linux-amd64.tar.gz && \
    tar -xvf migrate.tar.gz && \
    mv migrate /usr/local/bin/migrate && \
    chmod +x /usr/local/bin/migrate && \
    migrate --version || echo "Migrate installation failed"

# Install Air inside the backend container
RUN go install github.com/air-verse/air@latest && \
    mv /go/bin/air /usr/local/bin/air

# Copy entrypoint.sh and set correct permissions
RUN chmod +x /app/entrypoint.sh && chown root:root /app/entrypoint.sh

EXPOSE 8080 2345

# Build lease cron binary
RUN go build -o /app/bin/expire-leases ./cmd/cron/expire_leases.go

# Copy crontab
COPY ./backend/cron/leases-cron /etc/cron.d/leases-cron
RUN chmod 0644 /etc/cron.d/leases-cron

# Apply cron job
RUN crontab /etc/cron.d/leases-cron

# Run entrypoint
RUN ls -la
ENTRYPOINT [ "/app/entrypoint.sh" ]
