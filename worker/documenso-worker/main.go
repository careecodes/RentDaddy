package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

// Simple webhook payload representation
type WebhookPayload struct {
	Event string          `json:"event"`
	Data  json.RawMessage `json:"data"`
}

// WebhookPayload represents a simplified webhook payload structure
// All template-related functionality has been removed as backend will handle templates
func main() {
	log.Println("Starting Documenso Background Job Worker")
	// Get database connection parameters from env vars with defaults
	pgUser := getEnv("POSTGRES_USER", "documenso")
	pgPassword := getEnv("POSTGRES_PASSWORD", "password") // This will be overridden by secrets in ECS
	//pgHost := getEnv("POSTGRES_HOST", "documenso-postgres")
	pgPort := getEnv("POSTGRES_PORT", "5432")
	pgDB := getEnv("POSTGRES_DB", "documenso")
	// Get startup delay from env with default - increase defaults for better reliability
	startupDelaySeconds := getIntEnv("STARTUP_DELAY", 60)
	maxRetries := getIntEnv("MAX_CONNECTION_RETRIES", 30)
	// Add startup delay to allow database to initialize
	log.Printf("Waiting %d seconds before connecting to database to allow for initialization...", startupDelaySeconds)
	time.Sleep(time.Duration(startupDelaySeconds) * time.Second)
	var cmdOutput []byte
	// Log network configuration for debugging
	log.Println("=================== NETWORK DIAGNOSTICS ===================")
	cmdOutput, err := exec.Command("ip", "addr", "show").CombinedOutput()
	if err != nil {
		log.Printf("Error running ip addr: %v", err)
	} else {
		log.Printf("Network interfaces:\n%s", string(cmdOutput))
	}
	cmdOutput, err = exec.Command("cat", "/etc/hosts").CombinedOutput()
	if err != nil {
		log.Printf("Error reading /etc/hosts: %v", err)
	} else {
		log.Printf("/etc/hosts contents:\n%s", string(cmdOutput))
	}
	// Try to ping documenso-postgres to verify connectivity
	cmdOutput, err = exec.Command("ping", "-c", "3", "documenso-postgres").CombinedOutput()
	if err != nil {
		log.Printf("Error pinging documenso-postgres: %v - %s", err, string(cmdOutput))
	} else {
		log.Printf("Ping to documenso-postgres successful:\n%s", string(cmdOutput))
	}
	log.Println("=================== END DIAGNOSTICS ===================")
	// Force Docker bridge network by using container name
	pgHost := "documenso-postgres"
	log.Printf("Using Docker container name for DB host: %s", pgHost)
	// Try different connection string formats
	connStr1 := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		pgUser, pgPassword, pgHost, pgPort, pgDB)
	connStr2 := fmt.Sprintf("postgresql://%s:%s@%s:%s/%s",
		pgUser, pgPassword, pgHost, pgPort, pgDB)
	connStr3 := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		pgHost, pgPort, pgUser, pgPassword, pgDB)
	// Log connection details (redact password)
	log.Printf("Preparing connection with host=%s port=%s user=%s dbname=%s",
		pgHost, pgPort, pgUser, pgDB)
	// Get other config from env vars with defaults - use public endpoints for ECS
	backendURL := getEnv("BACKEND_URL", "https://api.curiousdev.net")
	webhookPath := getEnv("WEBHOOK_PATH", "/webhooks/documenso")
	webhookSecret := getEnv("DOCUMENSO_WEBHOOK_SECRET", "")
	pollInterval := getIntEnv("POLL_INTERVAL", 15) // seconds
	debug := getEnv("DEBUG", "false") == "true"
	// Initialize documensoBaseURL with proper container name for ECS networking
	documensoBaseURL := getEnv("DOCUMENSO_BASE_URL", "http://documenso:3000")

	// Get frontend URL for email templates - use VITE_BACKEND_URL's domain but with app subdomain
	// Extract the domain part from BACKEND_URL and create the frontend URL with app subdomain
	backendDomain := strings.TrimPrefix(strings.TrimPrefix(backendURL, "https://"), "http://")
	backendDomain = strings.TrimPrefix(backendDomain, "api.") // Remove "api." prefix if present
	appURL := "https://app." + backendDomain
	logoURL := appURL + "/logo.png"

	log.Printf("Using app URL %s and logo URL %s for email templates", appURL, logoURL)
	log.Printf("Documenso base URL: %s", documensoBaseURL)

	// Initialize email template manager
	templatePath := filepath.Join(".", "templates")
	if err != nil {
		log.Printf("Warning: Failed to initialize email template manager: %v", err)
		log.Printf("Will fall back to in-memory templates if needed")
	} else {
		log.Printf("Successfully loaded email templates from %s", templatePath)
	}
	// Setup more verbose logging for debug mode
	if debug {
		log.Println("DEBUG mode enabled - verbose logging active")
		log.Printf("Configuration: Backend URL: %s, Webhook Path: %s", backendURL, webhookPath)
		log.Printf("Poll interval: %d seconds", pollInterval)
	}
	log.Printf("Connecting to database at %s:%s/%s as %s", pgHost, pgPort, pgDB, pgUser)
	// Try multiple connection approaches with retries
	var db *sql.DB
	// Reset err to nil (it was declared above in network diagnostics)
	err = nil
	var connectionSuccess bool = false
	// Retry loop
	for retry := 0; retry < maxRetries && !connectionSuccess; retry++ {
		if retry > 0 {
			retryDelay := 5 * time.Second * time.Duration(retry) // Exponential backoff
			if retryDelay > 30*time.Second {
				retryDelay = 30 * time.Second // Cap at 30 seconds
			}
			log.Printf("Retrying connection (attempt %d/%d) after %d seconds...",
				retry+1, maxRetries, int(retryDelay.Seconds()))
			time.Sleep(retryDelay)
		}
		// Try different connection string formats
		var err1, err2, err3 error
		log.Println("Trying connection string format 1...")
		db, err1 = sql.Open("postgres", connStr1)
		if err1 != nil {
			log.Printf("Format 1 failed: %v", err1)
		} else {
			// Test connection
			err = db.Ping()
			if err == nil {
				log.Println("Successfully connected using format 1")
				connectionSuccess = true
				break
			} else {
				log.Printf("Format 1 ping failed: %v", err)
				db.Close()
			}
		}
		log.Println("Trying connection string format 2...")
		db, err2 = sql.Open("postgres", connStr2)
		if err2 != nil {
			log.Printf("Format 2 failed: %v", err2)
		} else {
			// Test connection
			err = db.Ping()
			if err == nil {
				log.Println("Successfully connected using format 2")
				connectionSuccess = true
				break
			} else {
				log.Printf("Format 2 ping failed: %v", err)
				db.Close()
			}
		}
		log.Println("Trying connection string format 3...")
		db, err3 = sql.Open("postgres", connStr3)
		if err3 != nil {
			log.Printf("Format 3 failed: %v", err3)
			continue // Try again in next retry
		} else {
			// Test connection
			err = db.Ping()
			if err == nil {
				log.Println("Successfully connected using format 3")
				connectionSuccess = true
				break
			} else {
				log.Printf("Format 3 ping failed: %v", err)
				db.Close()
			}
		}
	}
	// Check if connection was successful after retries
	if !connectionSuccess {
		log.Fatalf("Failed to connect to database after %d retries: %v", maxRetries, err)
	}
	defer db.Close()
	// Test basic query
	var version string
	err = db.QueryRow("SELECT version()").Scan(&version)
	if err != nil {
		log.Printf("Error querying version: %v", err)
	} else {
		log.Printf("Connected to PostgreSQL: %s", version)
	}
	// Check if BackgroundJob table exists
	var tableExists bool
	err = db.QueryRow("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'BackgroundJob')").Scan(&tableExists)
	if err != nil {
		log.Printf("Error checking if BackgroundJob table exists: %v", err)
	} else {
		log.Printf("BackgroundJob table exists: %v", tableExists)
	}
	// Configure HTTP client for webhook delivery
	client := &http.Client{
		Timeout: 10 * time.Second,
	}
	// Re-check if the BackgroundJob table exists with a slightly different query
	err = db.QueryRow("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'BackgroundJob')").Scan(&tableExists)
	if err != nil {
		log.Fatalf("Failed to check if BackgroundJob table exists: %v", err)
	}
	// Create context with cancellation for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	// Start the polling loop
	for {
		select {
		case <-ctx.Done():
			return
		default:
			if tableExists {
				// Process jobs from BackgroundJob table
				processJobs(ctx, db, client, backendURL+webhookPath, webhookSecret)
			} else {
				// If no BackgroundJob table, look for pending webhook deliveries in alternative tables
				processPendingWebhooks(ctx, db, client, backendURL+webhookPath, webhookSecret)
			}
			// Note: We removed direct API job checking since those endpoints return 400 errors
			// and we're already processing jobs from the database directly
			// Sleep before next poll
			time.Sleep(time.Duration(pollInterval) * time.Second)
		}
	}
}

// Process jobs from the BackgroundJob table
func processJobs(ctx context.Context, db *sql.DB, client *http.Client, webhookURL, webhookSecret string) {
	// For debugging - log that we started processing jobs
	log.Println("Starting to process jobs - skipping schema checks due to previous errors")
	// Skip the schema checks for now - just assume we have retried column
	var hasAttemptNumColumn bool = false
	var hasRunAtColumn bool = false
	var hasRetried bool = true
	// Log schema information
	log.Printf("Schema detection: retried column exists: %v", hasRetried)
	// Let's try to run a simpler query to see if we can get any data
	var count int
	simpleErr := db.QueryRow("SELECT COUNT(*) FROM \"BackgroundJob\" WHERE status = 'PENDING'").Scan(&count)
	if simpleErr != nil {
		log.Printf("Error with simple query: %v", simpleErr)
	} else {
		log.Printf("Successfully ran simple query. Found %d pending jobs", count)
	}
	// Get pending jobs with dynamic query based on schema - no transaction needed for reading
	var query string
	if hasAttemptNumColumn && hasRunAtColumn {
		query = `
			SELECT id, name, payload, status, "attemptNum", "maxRetries"
			FROM "BackgroundJob"
			WHERE status = 'PENDING'
			AND "runAt" <= NOW()
			LIMIT 10
		`
	} else if hasRetried && hasRunAtColumn {
		query = `
			SELECT id, name, payload, status, retried, "maxRetries"
			FROM "BackgroundJob"
			WHERE status = 'PENDING'
			AND "runAt" <= NOW()
			LIMIT 10
		`
	} else if hasRetried {
		// No runAt column - just query based on status
		query = `
			SELECT id, name, payload, status, retried, "maxRetries"
			FROM "BackgroundJob"
			WHERE status = 'PENDING'
			LIMIT 10
		`
	} else {
		// Fallback query with minimal columns
		query = `
			SELECT id, name, payload, status, 0, 3
			FROM "BackgroundJob"
			WHERE status = 'PENDING'
			LIMIT 10
		`
	}
	// Execute the query - we don't need a transaction for just reading
	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		if !strings.Contains(err.Error(), "does not exist") {
			log.Printf("Error querying jobs: %v", err)
		}
		return
	}
	defer rows.Close()

	log.Printf("Found pending jobs, starting to process...")
	// Process each job
	jobsProcessed := 0
	for rows.Next() {
		var id string
		var name string
		var payload []byte
		var status string
		var retryCount int
		var maxRetries int
		err := rows.Scan(&id, &name, &payload, &status, &retryCount, &maxRetries)
		if err != nil {
			log.Printf("Error scanning job row: %v", err)
			continue
		}
		// Mark job as in progress with dynamic update based on schema
		updateTx, err := db.BeginTx(ctx, nil)
		if err != nil {
			log.Printf("Failed to begin update transaction: %v", err)
			continue // Skip this job but continue with others
		}

		// Use a named variable for the deferred function to ensure proper scope
		updateTxComplete := false
		defer func() {
			// Only roll back if the transaction wasn't committed
			if !updateTxComplete && updateTx != nil {
				if err := updateTx.Rollback(); err != nil && err != sql.ErrTxDone {
					log.Printf("Error during update transaction rollback: %v", err)
				}
			}
		}()

		// Update the job status to PROCESSING
		_, updateErr := updateTx.ExecContext(ctx, `
				UPDATE "BackgroundJob"
				SET status = 'PROCESSING', retried = retried + 1, "lastRetriedAt" = NOW()
				WHERE id = $1
			`, id)
		if updateErr != nil {
			log.Printf("Error updating job status: %v", updateErr)
			continue // Skip this job
		}

		// Commit the status update immediately
		if err := updateTx.Commit(); err != nil {
			log.Printf("Error committing status update: %v", err)
			continue // Skip this job
		}
		updateTxComplete = true

		log.Printf("Successfully marked job %s as PROCESSING", id)
		// Process based on job type
		success := false
		// Special handling for signup confirmation emails to add verification token
		if strings.Contains(name, "send.signup.confirmation.email") {
			// Parse the payload to extract the email
			var payloadData map[string]interface{}
			if err := json.Unmarshal(payload, &payloadData); err == nil {
				// Extract the email field
				if email, ok := payloadData["email"].(string); ok && email != "" {
					// Look up the token for this email
					token, err := getVerificationTokenForUserEmail(ctx, db, email)
					if err == nil && token != "" {
						// Enrich the payload with the token
						payloadData["token"] = token
						enrichedPayload, _ := json.Marshal(payloadData)
						payload = enrichedPayload
						log.Printf("Enhanced confirmation email payload with token for %s", email)
					} else {
						log.Printf("Could not find token for email %s: %v", email, err)
					}
				} else {
					log.Printf("Could not extract email from payload: %s", string(payload))
				}
			} else {
				log.Printf("Failed to parse confirmation email payload: %v", err)
			}
		}

		// Special handling for document signing emails - get signing URLs
		if strings.Contains(name, "send.signing.email") || strings.Contains(name, "document.signed") {
			var payloadData map[string]interface{}
			if err := json.Unmarshal(payload, &payloadData); err == nil {
				// Check for document ID in different locations
				var documentID string

				// Try to extract documentId from various possible locations
				if docID, ok := getDocumentIDFromPayload(payloadData); ok {
					documentID = docID
				}

				if documentID != "" {
					log.Printf("Found document ID %s for signing email", documentID)

					// Try to get recipient information
					var recipients []map[string]interface{}
					if data, ok := payloadData["data"].(map[string]interface{}); ok {
						if rcpts, ok := data["recipients"].([]interface{}); ok {
							for _, r := range rcpts {
								if rcptMap, ok := r.(map[string]interface{}); ok {
									// Create a recipient entry with available data
									rcptInfo := make(map[string]interface{})

									// Extract email and signing URL if present
									if email, ok := rcptMap["email"].(string); ok {
										rcptInfo["email"] = email
									}
									if name, ok := rcptMap["name"].(string); ok {
										rcptInfo["name"] = name
									}
									if signingURL, ok := rcptMap["signingUrl"].(string); ok {
										rcptInfo["signing_url"] = signingURL
									}

									// Add to recipients list if we have useful data
									if len(rcptInfo) > 0 {
										recipients = append(recipients, rcptInfo)
									}
								}
							}
						}
					}

					// If we have document ID but no signing URLs, try to get them from database
					if len(recipients) == 0 {
						// Look up document details in the Recipient table
						query := `
							SELECT r."email", r."name", r."token" 
							FROM "Recipient" r
							WHERE r."documentId" = $1
						`

						rows, err := db.QueryContext(ctx, query, documentID)
						if err == nil {
							defer rows.Close()

							// Process each recipient
							for rows.Next() {
								var email, name, token string
								if err := rows.Scan(&email, &name, &token); err == nil {
									// Create signing URL from token
									signingURL := fmt.Sprintf("https://documen.so/sign/%s", token)

									// Add to recipients list
									recipients = append(recipients, map[string]interface{}{
										"email":       email,
										"name":        name,
										"token":       token,
										"signing_url": signingURL,
									})

									log.Printf("Added signing URL for %s: %s", email, signingURL)
								}
							}
						} else {
							log.Printf("Error looking up recipients: %v", err)
						}
					}

					// Add document ID and recipients to payload
					payloadData["document_id"] = documentID
					if len(recipients) > 0 {
						payloadData["recipients"] = recipients
						log.Printf("Enhanced signing email payload with %d recipients", len(recipients))
					}

					// Skip email template creation - backend will handle this now
					log.Printf("Found document ID %s with %d recipients - forwarding to backend for email handling", documentID, len(recipients))

					// Simply pass basic information to leases.go for template handling
				}

				// Template generation has been removed
				// The backend will handle all email template rendering
				log.Printf("Skipping template generation - backend will handle email templates")

				// Update the payload with our enriched data
				enrichedPayload, _ := json.Marshal(payloadData)
				payload = enrichedPayload
			}
		}

		// Enhanced job type handling to include all required types:
		// 1. webhook events
		// 2. document.signed events
		// 3. document.completed events
		// 4. send.recipient.signed.email events
		// 5. send.signup.confirmation.email events
		// 6. Send Confirmation Email events (with case-insensitive fallback)
		if strings.Contains(name, "webhook") ||
			strings.Contains(name, "Send Confirmation Email") ||
			strings.Contains(strings.ToLower(name), "confirmation email") ||
			strings.Contains(name, "document.signed") ||
			strings.Contains(name, "document.completed") ||
			strings.Contains(name, "send.recipient.signed.email") ||
			strings.Contains(name, "send.signup.confirmation.email") ||
			strings.Contains(name, "send.email") {
			// Log the job details for debugging
			log.Printf("Processing job: %s with payload: %s", name, string(payload))
			// Forward payload to backend webhook endpoint with job name in context
			success = forwardJobToBackend(ctx, client, webhookURL, webhookSecret, name, payload)
		} else {
			log.Printf("Skipping unhandled job type: %s", name)
		}
		// Update job status based on result with a new transaction
		resultTx, err := db.BeginTx(ctx, nil)
		if err != nil {
			log.Printf("Failed to begin result transaction: %v", err)
			continue // Skip updating status but count as processed
		}

		// Use a named variable for the deferred function to ensure proper scope
		resultTxComplete := false
		defer func() {
			// Only roll back if the transaction wasn't committed
			if !resultTxComplete && resultTx != nil {
				if err := resultTx.Rollback(); err != nil && err != sql.ErrTxDone {
					log.Printf("Error during result transaction rollback: %v", err)
				}
			}
		}()

		var resultErr error
		if success {
			// Mark job as completed
			_, resultErr = resultTx.ExecContext(ctx, `
				UPDATE "BackgroundJob"
				SET status = 'COMPLETED'
				WHERE id = $1
			`, id)
			if resultErr == nil {
				log.Printf("Marked job %s as COMPLETED", id)
			}
		} else if retryCount >= maxRetries {
			// Check if lastError column exists
			var hasLastErrorColumn bool
			err := resultTx.QueryRowContext(ctx, `
				SELECT EXISTS (
					SELECT 1 FROM information_schema.columns 
					WHERE table_name = 'BackgroundJob' 
					AND column_name = 'lastError'
				)
			`).Scan(&hasLastErrorColumn)
			if err != nil {
				log.Printf("Error checking for lastError column: %v", err)
				continue
			}
			if hasLastErrorColumn {
				_, resultErr = resultTx.ExecContext(ctx, `
					UPDATE "BackgroundJob"
					SET status = 'FAILED', "lastError" = $2
					WHERE id = $1
				`, id, "Failed to process job after maximum retries")
			} else {
				_, resultErr = resultTx.ExecContext(ctx, `
					UPDATE "BackgroundJob"
					SET status = 'FAILED'
					WHERE id = $1
				`, id)
			}
			if resultErr == nil {
				log.Printf("Marked job %s as FAILED (reached max retries)", id)
			}
		} else {
			// Schedule retry with backoff if runAt exists
			if hasRunAtColumn {
				retryDelay := time.Duration(retryCount*retryCount) * time.Minute
				nextRunAt := time.Now().Add(retryDelay)
				_, resultErr = resultTx.ExecContext(ctx, `
					UPDATE "BackgroundJob"
					SET status = 'PENDING', "runAt" = $2
					WHERE id = $1
				`, id, nextRunAt)
				if resultErr == nil {
					log.Printf("Scheduled job %s for retry at %s", id, nextRunAt)
				}
			} else {
				// Just set back to pending
				_, resultErr = resultTx.ExecContext(ctx, `
					UPDATE "BackgroundJob"
					SET status = 'PENDING'
					WHERE id = $1
				`, id)
				if resultErr == nil {
					log.Printf("Reset job %s to PENDING for retry", id)
				}
			}
		}
		if resultErr != nil {
			log.Printf("Error updating job after processing: %v", resultErr)
		} else {
			// Commit the result update immediately
			if err := resultTx.Commit(); err != nil {
				log.Printf("Error committing result update: %v", err)
			} else {
				resultTxComplete = true
			}
		}
		jobsProcessed++

	}
	// Log summary of processed jobs
	if jobsProcessed > 0 {
		log.Printf("Successfully processed %d jobs", jobsProcessed)
	}
}

// Process pending webhook deliveries from other tables
func processPendingWebhooks(ctx context.Context, db *sql.DB, client *http.Client, webhookURL, webhookSecret string) {
	// First check if there's a webhookNotified column in the Document table
	var hasWebhookNotifiedColumn bool
	err := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM information_schema.columns 
			WHERE table_name = 'Document' 
			AND column_name = 'webhookNotified'
		)
	`).Scan(&hasWebhookNotifiedColumn)
	if err != nil {
		log.Printf("Error checking for webhookNotified column: %v", err)
		return
	}
	// Different query based on schema
	var query string
	if hasWebhookNotifiedColumn {
		query = `
			SELECT d.id, d.status, d."completedAt", w.url, w."userId", w."teamId"
			FROM "Document" d
			JOIN "Webhook" w ON (w."userId" = d."teamId" OR w."teamId" = d."teamId")
			WHERE d.status = 'COMPLETED'
			AND d."completedAt" IS NOT NULL
			AND d."webhookNotified" = false
			LIMIT 10
		`
	} else {
		// Fallback query for schemas without webhookNotified column
		// This will process all completed documents, which might cause duplicate webhooks
		// but our backend should be idempotent
		query = `
			SELECT d.id, d.status, d."completedAt", w.url, w."userId", w."teamId"
			FROM "Document" d
			JOIN "Webhook" w ON (w."userId" = d."userId" OR w."teamId" = d."teamId")
			WHERE d.status = 'COMPLETED'
			AND d."completedAt" IS NOT NULL
			AND d."completedAt" > NOW() - INTERVAL '1 day'
			LIMIT 10
		`
	}
	// Execute the appropriate query
	rows, err := db.QueryContext(ctx, query)
	// If query fails, it could be that the schema is different
	if err != nil {
		if !strings.Contains(err.Error(), "does not exist") {
			log.Printf("Error querying completed documents: %v", err)
		}
		return
	}
	defer rows.Close()
	for rows.Next() {
		var documentId int
		var status string
		var completedAt time.Time
		var webhookUrl string
		var userId int
		var teamId sql.NullInt64
		err := rows.Scan(&documentId, &status, &completedAt, &webhookUrl, &userId, &teamId)
		if err != nil {
			log.Printf("Error scanning document row: %v", err)
			continue
		}
		// Create webhook payload for document.completed event
		payload := WebhookPayload{
			Event: "document.completed",
			Data: json.RawMessage(fmt.Sprintf(`{
				"documentId": %d,
				"status": "%s",
				"completedAt": "%s"
			}`, documentId, status, completedAt.Format(time.RFC3339))),
		}
		// Marshal the payload
		payloadBytes, err := json.Marshal(payload)
		if err != nil {
			log.Printf("Error marshalling webhook payload: %v", err)
			continue
		}
		// Forward to backend
		success := forwardWebhook(ctx, client, webhookURL, webhookSecret, payloadBytes)
		// Mark as notified if successful
		if success {
			_, err := db.ExecContext(ctx, `
				UPDATE "Document"
				SET "webhookNotified" = true
				WHERE id = $1
			`, documentId)
			if err != nil {
				log.Printf("Error updating document as notified: %v", err)
			} else {
				log.Printf("Successfully sent webhook for document %d", documentId)
			}
		}
	}
}

// Forward webhook payload to backend
func forwardWebhook(ctx context.Context, client *http.Client, webhookURL, webhookSecret string, payload []byte) bool {
	// Parse the payload to check the event type
	var webhookData map[string]interface{}
	if err := json.Unmarshal(payload, &webhookData); err != nil {
		log.Printf("Error parsing webhook payload: %v", err)
		return false
	}
	// Log webhook delivery attempt
	event, _ := webhookData["event"].(string)
	log.Printf("Forwarding webhook event: %s to %s", event, webhookURL)
	// Create request
	req, err := http.NewRequestWithContext(ctx, "POST", webhookURL, strings.NewReader(string(payload)))
	if err != nil {
		log.Printf("Error creating webhook request: %v", err)
		return false
	}
	// Set headers
	req.Header.Set("Content-Type", "application/json")
	if webhookSecret != "" {
		// Use the correct header name that the backend expects: X-Documenso-Secret
		req.Header.Set("X-Documenso-Secret", webhookSecret)
		// Keep the old header for backward compatibility
		req.Header.Set("X-Documenso-Signature", webhookSecret)
	}
	// Send request
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error sending webhook: %v", err)
		return false
	}
	defer resp.Body.Close()
	// Check response
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Printf("Webhook successfully delivered: %s (status %d)", event, resp.StatusCode)
		return true
	} else {
		log.Printf("Webhook delivery failed: %s (status %d)", event, resp.StatusCode)
		return false
	}
}

// Forward job payload to backend with job type information
func forwardJobToBackend(ctx context.Context, client *http.Client, webhookURL, webhookSecret string, jobType string, payload []byte) bool {
	// First try to parse the payload to see if it's a valid JSON
	var originalPayload map[string]interface{}
	err := json.Unmarshal(payload, &originalPayload)
	if err != nil {
		log.Printf("Warning: Failed to parse job payload as JSON: %v", err)
		// Create a new JSON wrapper for non-JSON payloads
		originalPayload = map[string]interface{}{
			"raw_data": string(payload),
		}
	}
	
	// Map job names to standardized job IDs
	jobID := mapJobNameToID(jobType)
	
	// Create a new payload with additional context
	enrichedPayload := map[string]interface{}{
		"event":            jobID,             // Use standardized job ID as the event name
		"data":             originalPayload,   // Original payload as data
		"job":              jobID,             // Use standardized job ID
		"job_type":         jobID,             // Use standardized job ID  
		"job_id":           jobID,             // Add standardized job ID
		"job_definition_id": jobID,            // Add job definition ID (same as job ID)
		"original_job_name": jobType,          // Keep original job name for reference
		"timestamp":        time.Now().Unix(), // Add processing timestamp
	}
	
	// Handle document.completed payloads - make sure to include document ID
	// directly in the enriched payload since it will be accessed in the webhook handler
	if strings.Contains(jobType, "document.completed") {
		if docID, ok := getDocumentIDFromPayload(originalPayload); ok {
			log.Printf("Extracted document ID %s from document.completed job", docID)
			enrichedPayload["documentId"] = docID
		}
	}
	
	// Marshal the enriched payload
	enrichedPayloadBytes, err := json.Marshal(enrichedPayload)
	if err != nil {
		log.Printf("Error creating enriched payload: %v", err)
		return false
	}
	log.Printf("Forwarding job %s (mapped to ID: %s) to %s with event=%s job_type=%s", 
		jobType, jobID, webhookURL, enrichedPayload["event"], enrichedPayload["job_type"])
	// Create request
	req, err := http.NewRequestWithContext(ctx, "POST", webhookURL, bytes.NewReader(enrichedPayloadBytes))
	if err != nil {
		log.Printf("Error creating job request: %v", err)
		return false
	}
	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Documenso-Job-Type", jobType)       // Add job type header
	req.Header.Set("X-Documenso-Job-ID", jobID)           // Add job ID header
	req.Header.Set("X-Documenso-Job-Definition-ID", jobID) // Add job definition ID header
	if webhookSecret != "" {
		// Use the correct header name that the backend expects: X-Documenso-Secret
		req.Header.Set("X-Documenso-Secret", webhookSecret)
		// Keep the old header for backward compatibility
		req.Header.Set("X-Documenso-Signature", webhookSecret)
	}
	// Send request
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error sending job to backend: %v", err)
		return false
	}
	defer resp.Body.Close()
	// Read response body for debugging
	respBody, _ := io.ReadAll(resp.Body)
	// Check response
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Printf("Job successfully delivered: %s (status %d)", jobType, resp.StatusCode)
		log.Printf("Response: %s", string(respBody))
		return true
	} else {
		log.Printf("Job delivery failed: %s (status %d): %s", jobType, resp.StatusCode, string(respBody))
		return false
	}
}

// Note: We removed the checkDocumensoJobs function since it was consistently getting 400 errors
// when trying to access API endpoints that don't exist or aren't accessible.
// Helper function to get environment variable with fallback
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

// Helper function to get integer environment variable with fallback
func getIntEnv(key string, fallback int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intVal, err := fmt.Sscanf(value, "%d", new(int)); err == nil && intVal > 0 {
			return intVal
		}
	}
	return fallback
}

// Helper function to extract document ID from payload
func getDocumentIDFromPayload(payload map[string]interface{}) (string, bool) {
	// Try extracting from top level
	if docID, ok := extractDocumentID(payload); ok {
		return docID, true
	}
	// Try extracting from nested payload object
	if payloadObj, ok := payload["payload"].(map[string]interface{}); ok {
		if docID, ok := extractDocumentID(payloadObj); ok {
			return docID, true
		}
	}
	// Try extracting from nested data object
	if dataObj, ok := payload["data"].(map[string]interface{}); ok {
		if docID, ok := extractDocumentID(dataObj); ok {
			return docID, true
		}
	}
	return "", false
}

// Helper function to extract document ID from an object with various possible field names
func extractDocumentID(obj map[string]interface{}) (string, bool) {
	// Check for common variations of document ID field names
	for _, field := range []string{"documentId", "document_id", "id", "docId", "doc_id"} {
		if val, ok := obj[field]; ok {
			// Handle different types
			switch v := val.(type) {
			case string:
				return v, true
			case float64:
				return fmt.Sprintf("%.0f", v), true
			case int:
				return fmt.Sprintf("%d", v), true
			case json.Number:
				return v.String(), true
			}
		}
	}
	return "", false
}

// mapJobNameToID converts human-readable job names to standardized job IDs
// These IDs match the constants defined in the Documenso codebase
func mapJobNameToID(jobName string) string {
	// Map of known job types to their standardized IDs
	jobIDMap := map[string]string{
		"Send Confirmation Email":         "send.signup.confirmation.email",
		"send.signup.confirmation.email":  "send.signup.confirmation.email",
		"signup.confirmation":             "send.signup.confirmation.email",
		"confirmation.email":              "send.signup.confirmation.email",
		"send.signup.email":               "send.signup.email",
		"send.signing.email":              "send.signing.email",
		"document.signed":                 "document.signed",
		"document.completed":              "document.completed",
		"send.recipient.signed.email":     "send.recipient.signed.email",
		"send.document.completed.email":   "send.document.completed.email",
	}
	
	// First check for exact match
	if id, ok := jobIDMap[jobName]; ok {
		return id
	}
	
	// If no exact match, check for partial match
	for name, id := range jobIDMap {
		if strings.Contains(strings.ToLower(jobName), strings.ToLower(name)) {
			return id
		}
	}
	
	// If no match found, use best guess based on content
	if strings.Contains(strings.ToLower(jobName), "confirmation") || 
	   strings.Contains(strings.ToLower(jobName), "verify") {
		return "send.signup.confirmation.email"
	} else if strings.Contains(strings.ToLower(jobName), "sign") {
		return "send.signing.email"
	} else if strings.Contains(strings.ToLower(jobName), "complet") {
		return "document.completed"
	}
	
	// Fallback - return original name but in ID format
	return strings.ToLower(strings.ReplaceAll(jobName, " ", "."))
}

// Function to look up verification tokens by email
func getVerificationTokenForUserEmail(ctx context.Context, db *sql.DB, email string) (string, error) {
	var token string
	// Query to get the most recent verification token for a user by email
	query := `
        SELECT vt."token"
        FROM "VerificationToken" vt
        JOIN "User" u ON u."id" = vt."userId"
        WHERE u."email" = $1
        AND vt."identifier" = 'confirmation-email'
        AND vt."completed" = false
        ORDER BY vt."createdAt" DESC
        LIMIT 1
    `
	err := db.QueryRowContext(ctx, query, email).Scan(&token)
	if err != nil {
		return "", err
	}
	return token, nil
}
