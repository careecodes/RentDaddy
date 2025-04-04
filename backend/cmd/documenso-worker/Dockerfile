FROM --platform=linux/amd64 golang:1.23 AS builder

WORKDIR /app

# Copy entire backend directory
COPY . .

# Install PostgreSQL driver
RUN go get github.com/lib/pq

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /documenso-worker ./cmd/documenso-worker

# Create the minimal production image
FROM --platform=linux/amd64 alpine:latest

# Add ca-certificates for HTTPS requests and network tools for diagnostics
RUN apk --no-cache add ca-certificates iputils ip6tables bind-tools

WORKDIR /

# Copy the binary from builder
COPY --from=builder /documenso-worker /documenso-worker

# Run the application
ENTRYPOINT ["/documenso-worker"]