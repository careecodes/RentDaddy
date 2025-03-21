#!/bin/bash
# setup.sh - Initialize project structure and files


# Add to crontab (edit with crontab -e)
0 0 * * * task cron:expire-leases >> logs/lease_cron.log 2>&1
