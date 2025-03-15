FROM golang:1.23-alpine as builder
# Copy application files
COPY . .
COPY go.mod go.sum ./
RUN go mod download

# Check if server.go exists and print directory contents
RUN ls -la
RUN if [ -f server.go ]; then echo "server.go exists"; else echo "server.go does not exist!"; fi

# Attempt build with verbose output and copy binary from builder
RUN go build -o /tmp/server . || (echo "BUILD FAILED!" && exit 1)

FROM golang:1.23-alpine

# Set working directory
WORKDIR /app
COPY --from=builder /tmp/server /tmp/server
# Copy application files from builder stage to container
COPY . .

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

EXPOSE 8080

# Run entrypoint
CMD ["entrypoint.sh"]
RUN ls -la
ENTRYPOINT [ "/app/entrypoint.sh" ]
