#!/bin/bash
# setup.sh - Initialize project structure and files


# Add to crontab (edit with crontab -e) - cronjob to change lease status in leases table to expired leases every midnight.
0 0 * * * task cron:expire-leases >> logs/lease_cron.log 2>&1


docker network create documenso-rentdaddy
