FROM golang:1.23-alpine

# Set working directory
WORKDIR /app

# Install necessary tools using a single RUN command to reduce layers
RUN apk update && apk add --no-cache \
    curl \
    git \
    postgresql-client \
    nodejs \
    npm \
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

# Vendor dependencies to avoid downloading on rebuild
RUN go mod tidy && go mod download

# Install Air for development mode
RUN go install github.com/air-verse/air@latest \
    && mv /go/bin/air /usr/local/bin/air

# Copy application source files
COPY . .

# Create necessary directories
RUN mkdir -p /app/tmp /app/temp

# Build the application
RUN go build -o /app/tmp/server .

# Set up cron job
COPY ./cmd/cron/leases-cron /etc/cron.d/leases-cron
RUN chmod 0644 /etc/cron.d/leases-cron \
    && crontab /etc/cron.d/leases-cron

# Copy entrypoint.sh and set correct permissions
RUN chmod +x /app/entrypoint.sh

EXPOSE 8080

# Environment variable to control whether to use Air
ENV USE_AIR=false

ENTRYPOINT ["/app/entrypoint.sh"]