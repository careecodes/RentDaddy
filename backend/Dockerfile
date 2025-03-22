FROM golang:1.23-alpine as builder

WORKDIR /build

# Copy only files needed for dependencies first to leverage Docker cache
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application code
COPY . .

# Build the application
RUN go build -o /tmp/server .

FROM golang:1.23-alpine

# Set working directory
WORKDIR /app

# Install necessary tools using a single RUN command to reduce layers
RUN apk update && apk add --no-cache \
    curl \
    git \
    postgresql-client \
    && rm -rf /var/cache/apk/*

# Install Task CLI
RUN curl -sL https://github.com/go-task/task/releases/download/v3.37.1/task_linux_amd64.tar.gz | tar -xz -C /usr/local/bin task \
    && chmod +x /usr/local/bin/task

# Install golang-migrate
RUN wget -O migrate.tar.gz https://github.com/golang-migrate/migrate/releases/download/v4.18.2/migrate.linux-amd64.tar.gz \
    && tar -xvf migrate.tar.gz \
    && mv migrate /usr/local/bin/migrate \
    && chmod +x /usr/local/bin/migrate \
    && rm migrate.tar.gz

# Install Air for development mode (optional)
RUN go install github.com/air-verse/air@latest \
    && mv /go/bin/air /usr/local/bin/air

# Copy compiled binary from builder stage
COPY --from=builder /tmp/server /app/tmp/server

# Copy application source files (needed for development)
COPY . .

# Create necessary directories
RUN mkdir -p /app/tmp /app/temp

# Set up cron job
COPY ./cmd/cron/leases-cron /etc/cron.d/leases-cron
RUN chmod 0644 /etc/cron.d/leases-cron \
    && crontab /etc/cron.d/leases-cron

# Copy Air configuration
COPY .air.toml /app/.air.toml

# Copy entrypoint.sh and set correct permissions
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080

# Environment variable to control whether to use Air (default: false)
ENV USE_AIR=false

ENTRYPOINT ["/app/entrypoint.sh"]