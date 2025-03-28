# Check if tasks are running
aws ecs list-tasks --cluster rentdaddy-cluster --service-name rentdaddy-documenso-postgres-service

# Check service discovery
aws servicediscovery list-instances --service-id srv-f6m4nuzqtnqjnmix

terraform apply

# After apply completes successfully
aws ecs update-service --cluster rentdaddy-cluster --service rentdaddy-documenso-postgres-service --force-new-deployment
aws ecs update-service --cluster rentdaddy-cluster --service rentdaddy-documenso-service --force-new-deployment

aws servicediscovery list-services | grep database
aws servicediscovery list-instances --service-id srv-f6m4nuzqtnqjnmix

# View the logs from the Documenso container
docker logs 6afe03c1e089 

# Check if the Documenso container can reach the Postgres container
docker exec -it 6afe03c1e089 sh -c "ping -c 3 main-postgres.rentdaddy.local"

# Or try to connect using netcat if available
docker exec -it 6afe03c1e089 sh -c "nc -zv main-postgres.rentdaddy.local 5432"

# Get into the Documenso container
docker exec -it 6afe03c1e089 sh

# Inside the container, use the environment variables to connect to PostgreSQL
# You can use 'psql' if it's available, otherwise let's try a simple check
psql -h main-postgres.rentdaddy.local -U documenso -d documenso -c "SELECT 1"
# FAILED

# If psql isn't available, you might be able to use curl or wget to test network connectivity
curl -v telnet://main-postgres.rentdaddy.local:5432

# You can also check the logs for database connection issues
exit

# View container logs
docker logs 6afe03c1e089 | grep -i "database\|postgres\|connection"

# Connect to one of the backend containers
docker exec -it 065f64ccf9c7 /bin/bash

# Inside the container, check for database connection
# If the application uses environment variables to connect
echo $POSTGRES_HOST
echo $POSTGRES_PASSWORD

# Test connection (method depends on what tools are available)
# If the backend has database tools installed
psql -h main-postgres.rentdaddy.local -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1"

# Check application logs for database connection issues
exit

# View logs
docker logs 065f64ccf9c7 | grep -i "database\|postgres\|connection"

# Connect to the backend container
docker exec -it 065f64ccf9c7 /bin/bash

# Check the environment variables to see the Documenso API settings
echo $DOCUMENSO_API_URL

# Test connectivity to the Documenso API
curl -v $DOCUMENSO_API_URL

# If the API requires authentication, you might need to use the API key
# Check if you have the API key set
echo $DOCUMENSO_API_KEY

# Make a basic API call with authentication (adjust paths as needed)
curl -v -H "Authorization: Bearer $DOCUMENSO_API_KEY" $DOCUMENSO_API_URL/api/health

# Check logs for API connection issues
exit

# View logs
docker logs 065f64ccf9c7 | grep -i "documenso\|api"