#!/bin/bash
# This script simulates the cron job that would run at midnight
# Save as simulate-cron.sh and make executable with chmod +x simulate-cron.sh

echo "Simulating midnight cron job for lease status updates..."
echo "$(date) - Running lease status update" >> cron-simulation.log

# Call the API endpoint to update lease statuses
curl -s -X POST "http://localhost:8080/admin/tenants/leases/update-statuses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImlhdCI6MTc0MjUzNDA2OCwiZXhwIjoxNzQyNTM3NjY4LCJyb2xlIjoiYWRtaW4ifQ.5w2Z4VtN6LW9AkmK6JIRvNVdWSnH8d5pCT1eW-GHbzk" \
  -o /dev/null

status=$?
if [ $status -eq 0 ]; then
    echo "$(date) - Lease status update completed successfully" >> cron-simulation.log
    echo "Cron job simulation completed successfully."
else
    echo "$(date) - Lease status update failed with exit code $status" >> cron-simulation.log
    echo "Cron job simulation failed with exit code $status."
fi

echo "Log written to cron-simulation.log"