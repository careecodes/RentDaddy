FROM golang:1.23-alpine

WORKDIR /app

# Install necessary tools
RUN apk add --no-cache curl git

# Copy Go module files first for better caching
COPY go.* ./
RUN go mod download || echo "No dependencies to download"

# Copy the rest of the application
COPY . .

# Check if server.go exists and print directory contents
RUN ls -la
RUN if [ -f server.go ]; then echo "server.go exists"; else echo "server.go does not exist!"; fi

# Attempt build with verbose output
RUN go build -v -o server server.go || (echo "BUILD FAILED!" && exit 1)

EXPOSE 8080

CMD ["./server"]