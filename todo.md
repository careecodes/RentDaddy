I need to find out why:
- [x] Load data to frontend correctly
- [x] Generate draft lease data with pdfs
- [x] New lease if tenant has none
- [x] my file is not writing to disk
- [x] my pdf is not generating
- [x] there is a 400 response
- [x] How to prevent the submit button from being pressed, or the modal from rerendering, after I hit submit/OK on it.
- [x] Redirect to success or fail
- [x] Send Lease should handle if there is an existing record, and use update instead of insert into the lease table.
- [x] My PDF is not uploading to documenso
- [x] Send documenso bucket via Bitwarden Secrets
- [x] is_Signed --> remove. lease status changes to active
- [ ] Prevent insert when existing lease has the same details (compare dates not their times)
- [ ] Renew Lease - when renewed, add 1 to lease_number, and set status to valid.
- [ ] Renew Lease - handle renewal start and end date conditions/restrictions on the frontend
- [ ] increment lease_version for renewed leased
- [ ] Terminate lease - when deleted on our app, delete on documenso. When deleted on documenso, delete on our app (webhook)
- [ ] Update documenso bucket via Bitwarden Secrets
- [ ] include lease url on documenso even in draft
- [ ] URL for signing should be returned for Reece
- [ ] Return link for lease and save to database both when sending and when renewing
- [ ] Make sure fields appear in PDF and make PDF better/1 page - add fields to admin side, and only one signature for the recipient
- [ ] if draft is deleted, it should be deleted on documenso.
- [ ] Can I use the document signing webhook for document signing from documenso to alert our backend for signing
- [ ] Make sure people are using http://backend:8080 for VITE_BACKEND_URL
- [ ] Webhook to Backend/DB --> ngrok
- [ ] Edit draft
- [ ] If lease is signed, apartment not available
- [ ] Write up for Reece on cli commands for s3 bucket to verify connectivity + SMTP + 
- [ ] Webhook for delete on documenso
- [ ] Cron Job for changing status at midnight for changing status of leases to expired, active



Deployment:

1) SES:
https://aws.amazon.com/blogs/messaging-and-targeting/forward-incoming-email-to-an-external-destination/
2) Write-up for self-hosting
