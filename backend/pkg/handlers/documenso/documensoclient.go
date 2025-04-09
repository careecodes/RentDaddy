package documenso

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

// DocumensoClientInterface defines interactions with the Documenso API
type DocumensoClientInterface interface {
	UploadDocument(pdfData []byte, title string) (string, error)

	UploadDocumentWithSigners(pdfData []byte, title string, signers []Signer) (string, map[string]RecipientInfo, string, error)

	VerifyDocumentExists(documentID string) (bool, error)
	GetTenantSigningURL(documentID string, tenantEmail string) (string, error)
	DeleteDocument(documentID string) error
	DownloadDocument(documentID string) ([]byte, error)
	SendDocument(documentID string) (map[string]string, error)
}

// DocumensoClient handles Documenso API interactions
type DocumensoClient struct {
	BaseURL string
	ApiKey  string
	Client  *http.Client
}

// NewDocumensoClient initializes a new Documenso API client
func NewDocumensoClient(baseURL, apiKey string) *DocumensoClient {
	if !strings.HasSuffix(baseURL, "/api/v1") {
		baseURL = strings.TrimRight(baseURL, "/") + "/api/v1"
	}

	return &DocumensoClient{
		BaseURL: baseURL,
		ApiKey:  apiKey,
		Client:  &http.Client{Timeout: 60 * time.Second},
	}
}

// SignerRole defines the role of a document signer
type SignerRole string

const (
	// SignerRoleSigner represents a user who needs to sign the document
	SignerRoleSigner SignerRole = "SIGNER"
	// SignerRoleViewer represents a user who only views the document
	SignerRoleViewer SignerRole = "VIEWER"
)

// Signer represents a person who will sign or view a document
type Signer struct {
	Name  string     `json:"name"`
	Email string     `json:"email"`
	Role  SignerRole `json:"role"`
}

// RecipientInfo stores information about a document recipient
type RecipientInfo struct {
	ID         int    `json:"id"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	SigningURL string `json:"signing_url"`
}

// UploadDocumentWithSigners uploads a document and assigns signers
func (c *DocumensoClient) UploadDocumentWithSigners(
	pdfData []byte,
	title string,
	signers []Signer,
) (string, map[string]RecipientInfo, string, error) {
	// Step 1: Create document with recipients
	createDocumentURL := fmt.Sprintf("%s/documents", c.BaseURL)
	log.Println("[Upload] Creating document with signers:", createDocumentURL)
	// this should ideally be done after the documenso signing webhook not here
	var s3bucket string
	// Convert signers to API-recognized format
	recipients := make([]map[string]interface{}, len(signers))
	for i, signer := range signers {
		recipients[i] = map[string]interface{}{
			"name":  signer.Name,
			"email": signer.Email,
			"role":  signer.Role,
		}
	}

	requestBody := map[string]interface{}{
		"title":      title,
		"recipients": recipients,
		"meta":       map[string]interface{}{},
	}

	requestBodyJSON, err := json.Marshal(requestBody)
	if err != nil {
		return "", nil, "", fmt.Errorf("failed to marshal request body: %w", err)
	}

	log.Printf("📌 Request payload:\n%s", string(requestBodyJSON))

	req, err := http.NewRequest("POST", createDocumentURL, bytes.NewBuffer(requestBodyJSON))
	if err != nil {
		return "", nil, "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.Client.Do(req)
	if err != nil {
		return "", nil, "", fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", nil, "", fmt.Errorf("API returned status: %d, response: %s", resp.StatusCode, string(body))
	}

	var response struct {
		UploadURL  string `json:"uploadUrl"`
		DocumentID int    `json:"documentId"`
		Recipients []struct {
			RecipientId int    `json:"recipientId"`
			Name        string `json:"name"`
			Email       string `json:"email"`
			Token       string `json:"token"`
			Role        string `json:"role"`
			SigningURL  string `json:"signingUrl"`
		} `json:"recipients"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", nil, "", fmt.Errorf("failed to parse response: %w", err)
	}
	s3bucket = response.UploadURL
	log.Printf("📌 Documenso Upload URL: %s", response.UploadURL)

	// Step 2: Upload the PDF
	uploadReq, err := http.NewRequest("PUT", response.UploadURL, bytes.NewReader(pdfData))
	if err != nil {
		return "", nil, "", fmt.Errorf("failed to create upload request: %w", err)
	}
	uploadReq.Header.Set("Content-Type", "application/pdf")

	uploadResp, err := http.DefaultClient.Do(uploadReq)
	if err != nil {
		return "", nil, "", fmt.Errorf("upload request failed: %w", err)
	}
	defer uploadResp.Body.Close()

	body, err := io.ReadAll(uploadResp.Body)
	if err != nil {
		log.Printf("❌ Error reading upload response body: %v", err)
	} else {
		log.Printf("📌 Documenso Upload Response: Status %d, Body: %s", uploadResp.StatusCode, string(body))
	}

	if uploadResp.StatusCode != http.StatusOK {
		return "", nil, "", fmt.Errorf("upload failed with status: %d, response: %s", uploadResp.StatusCode, string(body))
	}

	// Step 3: Send the document
	sendURL := fmt.Sprintf("%s/documents/%d/send", c.BaseURL, response.DocumentID)
	log.Printf("🚀 Sending document for signing: %s", sendURL)

	sendReq, err := http.NewRequest("POST", sendURL, bytes.NewBufferString("{}"))
	if err != nil {
		return "", nil, "", fmt.Errorf("failed to create send request: %w", err)
	}
	sendReq.Header.Set("Authorization", "Bearer "+c.ApiKey)
	sendReq.Header.Set("Content-Type", "application/json")

	sendResp, err := c.Client.Do(sendReq)
	if err != nil {
		return "", nil, "", fmt.Errorf("send request failed: %w", err)
	}
	defer sendResp.Body.Close()

	var sendResponse struct {
		DocumentID int `json:"documentId"`
		Recipients []struct {
			RecipientId int    `json:"recipientId"`
			Email       string `json:"email"`
			Name        string `json:"name"`
			SigningURL  string `json:"signingUrl"`
		} `json:"recipients"`
	}

	if err := json.NewDecoder(sendResp.Body).Decode(&sendResponse); err != nil {
		body, _ := io.ReadAll(sendResp.Body)
		return "", nil, "", fmt.Errorf("failed to decode send response: %s", string(body))
	}

	// Create a map to track recipient IDs and their signing URLs
	recipientInfoMap := make(map[string]RecipientInfo)
	for _, r := range sendResponse.Recipients {
		log.Printf("🔗 Recipient ID for %s: %d, Signing URL: %s", r.Email, r.RecipientId, r.SigningURL)
		recipientInfoMap[r.Email] = RecipientInfo{
			ID:         r.RecipientId,
			Email:      r.Email,
			Name:       r.Name,
			SigningURL: r.SigningURL,
		}
	}

	log.Printf("✅ Document %d successfully created and sent!", response.DocumentID)
	return fmt.Sprintf("%d", response.DocumentID), recipientInfoMap, s3bucket, nil
}

// VerifyDocumentExists checks if a document ID is valid in Documenso with retries
func (c *DocumensoClient) VerifyDocumentExists(documentID string) (bool, error) {
	maxRetries := 3
	for attempt := 0; attempt < maxRetries; attempt++ {
		url := fmt.Sprintf("%s/documents/%s", c.BaseURL, documentID)
		c.debugLog("Verifying document existence (attempt %d/%d): %s", attempt+1, maxRetries, url)

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return false, fmt.Errorf("failed to create request: %w", err)
		}

		req.Header.Set("Authorization", "Bearer "+c.ApiKey)

		resp, err := c.Client.Do(req)
		if err != nil {
			c.debugLog("API request failed: %v. Retrying...", err)
			time.Sleep(time.Duration(attempt+1) * time.Second)
			continue
		}
		defer resp.Body.Close()

		c.debugLog("Document verification status: %d", resp.StatusCode)

		if resp.StatusCode == http.StatusOK {
			c.debugLog("Document %s exists in Documenso", documentID)
			return true, nil
		} else if resp.StatusCode == http.StatusNotFound {
			// Wait and retry if document not found (might be still processing)
			if attempt < maxRetries-1 {
				c.debugLog("Document %s not found yet, retrying after delay...", documentID)
				time.Sleep(time.Duration(attempt+1) * time.Second)
				continue
			}
			c.debugLog("Document %s NOT found in Documenso after retries", documentID)
			return false, nil
		}

		body, _ := io.ReadAll(resp.Body)
		c.debugLog("Unexpected response: %s", string(body))

		// For other errors, wait and retry
		if attempt < maxRetries-1 {
			time.Sleep(time.Duration(attempt+1) * time.Second)
			continue
		}

		return false, fmt.Errorf("API returned unexpected status: %d, response: %s",
			resp.StatusCode, string(body))
	}

	return false, fmt.Errorf("document verification failed after %d attempts", maxRetries)
}

// DeleteDocument deletes a document from Documenso by ID
func (c *DocumensoClient) DeleteDocument(documentID string) error {
	// Construct the URL for document deletion
	url := fmt.Sprintf("%s/documents/%s", c.BaseURL, documentID)
	c.debugLog("Deleting document: %s", url)

	// Create DELETE request
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create delete request: %w", err)
	}

	// Set authorization header
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)

	// Send the request
	resp, err := c.Client.Do(req)
	if err != nil {
		return fmt.Errorf("delete request failed: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		c.debugLog("Delete error response: %s", string(body))
		return fmt.Errorf("document deletion failed with status: %d, response: %s", resp.StatusCode, string(body))
	}

	c.debugLog("Successfully deleted document %s", documentID)
	return nil
}

// DownloadDocument downloads a completed document from Documenso by ID
func (c *DocumensoClient) DownloadDocument(documentID string) ([]byte, error) {
	// First, get the download URL for the document
	downloadURL := fmt.Sprintf("%s/documents/%s/download", c.BaseURL, documentID)
	c.debugLog("Getting download URL: %s", downloadURL)

	req, err := http.NewRequest("GET", downloadURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create download request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.ApiKey)

	// Send the request
	resp, err := c.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("download URL request failed: %w", err)
	}
	defer resp.Body.Close()

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status: %d, response: %s", resp.StatusCode, string(body))
	}

	// Parse the response to get the actual download URL
	var response struct {
		DownloadURL string `json:"downloadUrl"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse download URL response: %w", err)
	}

	// Now download the actual document
	docReq, err := http.NewRequest("GET", response.DownloadURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create document download request: %w", err)
	}

	docResp, err := http.DefaultClient.Do(docReq) // Using DefaultClient for the download
	if err != nil {
		return nil, fmt.Errorf("document download request failed: %w", err)
	}
	defer docResp.Body.Close()

	if docResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(docResp.Body)
		return nil, fmt.Errorf("Document download failed with status: %d, response: %s", docResp.StatusCode, string(body))
	}

	// Read the document content
	content, err := io.ReadAll(docResp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read document content: %w", err)
	}

	return content, nil
}

// GetSigningURL returns the URL for signing a document
func (c *DocumensoClient) GetSigningURL(documentID string) string {
	base := strings.Replace(c.BaseURL, "/api/v1", "", 1)
	signURL := fmt.Sprintf("%s/sign/%s", base, documentID)
	log.Printf("[LEASE_UPSERT] Lease signing URL: %s", signURL)
	return signURL
}

// AddSignatureField adds a signature field or date field to a document for a specific recipient with retries
func (c *DocumensoClient) AddSignatureField(docID string, recipientID int, x, y, width, height float64, fieldType ...string) error {
	maxRetries := 3

	// Default to signature field if no type is specified
	actualFieldType := "SIGNATURE"
	if len(fieldType) > 0 && fieldType[0] == "DATE" {
		actualFieldType = "DATE"
	}

	for attempt := 0; attempt < maxRetries; attempt++ {
		// Format payload according to API spec
		payload := map[string]interface{}{
			"recipientId": recipientID,
			"type":        actualFieldType, // SIGNATURE or DATE
			"pageNumber":  1,               // First page
			"pageX":       x,
			"pageY":       y,
			"pageWidth":   width,
			"pageHeight":  height,
		}

		// Add field metadata for DATE fields - using proper format based on Documenso API
		if actualFieldType == "DATE" {
			payload["fieldMeta"] = map[string]interface{}{
				"type":        "date", // This should be lowercase "date" for the fieldMeta
				"required":    true,
				"label":       "Date",
				"placeholder": "MM/DD/YYYY", // Add a placeholder format
				"readOnly":    false,
				"textAlign":   "left",
				"fontSize":    12,
			}
		}

		// Log the payload for debugging
		requestJSON, err := json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("failed to marshal payload: %v", err)
		}
		log.Printf("%s field request payload: %s", actualFieldType, string(requestJSON))

		apiURL := fmt.Sprintf("%s/documents/%s/fields", c.BaseURL, docID)
		req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(requestJSON))
		if err != nil {
			return fmt.Errorf("failed to create request: %v", err)
		}
		req.Header.Set("Authorization", "Bearer "+c.ApiKey)
		req.Header.Set("Content-Type", "application/json")

		resp, err := c.Client.Do(req)
		if err != nil {
			log.Printf("API request failed: %v. Retrying in %d seconds...",
				err, attempt+1)
			time.Sleep(time.Duration(attempt+1) * time.Second)
			continue
		}
		defer resp.Body.Close()

		// Log full response for debugging
		respBody, _ := io.ReadAll(resp.Body)
		log.Printf("%s field creation response: %s", actualFieldType, string(respBody))

		if resp.StatusCode == http.StatusOK {
			log.Printf("Successfully created %s field for recipient %d", actualFieldType, recipientID)
			return nil
		}

		// If not successful, retry after delay
		if attempt < maxRetries-1 {
			log.Printf("Failed to create %s field (status %d). Retrying in %d seconds...",
				actualFieldType, resp.StatusCode, attempt+1)
			time.Sleep(time.Duration(attempt+1) * time.Second)
			continue
		}

		return fmt.Errorf("failed to create %s field after %d attempts: status %d, response: %s",
			actualFieldType, maxRetries, resp.StatusCode, string(respBody))
	}

	return fmt.Errorf("failed to create %s field after %d attempts", actualFieldType, maxRetries)
}

func (c *DocumensoClient) withRetry(maxRetries int, operation func() error) error {
	var err error
	for attempt := 0; attempt < maxRetries; attempt++ {
		err = operation()
		if err == nil {
			return nil // Success
		}

		// Log error and retry with delay
		c.debugLog("Operation failed (attempt %d/%d): %v", attempt+1, maxRetries, err)
		if attempt < maxRetries-1 {
			delay := time.Duration(attempt+1) * time.Second
			c.debugLog("Retrying in %v...", delay)
			time.Sleep(delay)
			continue
		}
	}
	return fmt.Errorf("operation failed after %d attempts: %w", maxRetries, err)
}

func (c *DocumensoClient) GetSigningURLs(documentID string, tenantEmail string, landlordEmail string) (string, string, error) {
	url := fmt.Sprintf("%s/documents/%s", c.BaseURL, documentID)
	log.Printf("[DOCUMENSO] Getting signing URLs for document ID: %s, tenant: %s, landlord: %s", documentID, tenantEmail, landlordEmail)
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)

	resp, err := c.Client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", "", fmt.Errorf("Documenso returned %d: %s", resp.StatusCode, string(body))
	}

	// Read the full response body first for debugging
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", fmt.Errorf("failed to read response body: %w", err)
	}
	
	// Log full response for debugging
	log.Printf("[DOCUMENSO] Response from Documenso: %s", string(responseBody))
	
	// Create a new reader from the response body for parsing
	var result struct {
		Recipients []struct {
			Email      string `json:"email"`
			SigningURL string `json:"signingUrl"`
		} `json:"recipients"`
	}
	if err := json.Unmarshal(responseBody, &result); err != nil {
		return "", "", fmt.Errorf("failed to parse response: %w", err)
	}
	
	// Log all recipients for debugging
	log.Printf("[DOCUMENSO] Found %d recipients in document", len(result.Recipients))
	for i, r := range result.Recipients {
		log.Printf("[DOCUMENSO] Recipient %d: Email: %s, SigningURL: %s", i+1, r.Email, r.SigningURL)
	}
	
	var tenantSigningURL, landlordSigningURL string
	
	// First try direct case-insensitive matching
	for _, r := range result.Recipients {
		if strings.EqualFold(r.Email, tenantEmail) {
			tenantSigningURL = r.SigningURL
			log.Printf("[DOCUMENSO] Found tenant email match: %s", r.Email)
		}
		if strings.EqualFold(r.Email, landlordEmail) {
			landlordSigningURL = r.SigningURL
			log.Printf("[DOCUMENSO] Found landlord email match: %s", r.Email)
		}
	}
	
	// If tenant email not found, try common patterns
	if tenantSigningURL == "" {
		// Extract potential tenant name parts for matching
		tenantNameParts := strings.Split(tenantEmail, "@")
		if len(tenantNameParts) > 0 {
			tenantName := tenantNameParts[0]
			
			// Log the name we're trying to match
			log.Printf("[DOCUMENSO] Tenant email not directly found. Looking for similar patterns for: %s", tenantName)
			
			// Try to find a match based on name patterns
			for _, r := range result.Recipients {
				// Check for similar email patterns
				if strings.Contains(r.Email, "@example.com") {
					// Check if the email contains parts of the name
					recipientName := strings.Split(r.Email, "@")[0]
					log.Printf("[DOCUMENSO] Comparing with potential recipient: %s", recipientName)
					
					// Basic similarity check
					// For more advanced cases, you might want to implement a more robust
					// string similarity algorithm
					if strings.Contains(recipientName, ".") || strings.Contains(recipientName, "_") {
						// Split by common separators
						parts := strings.FieldsFunc(recipientName, func(r rune) bool {
							return r == '.' || r == '_' || r == '-'
						})
						
						// Try to match first/last name patterns
						if len(parts) >= 2 {
							// Simple check if there's overlap between tenant name and recipient name
							matchScore := 0
							for _, part := range parts {
								if strings.Contains(tenantName, part) || strings.Contains(part, tenantName) {
									matchScore++
								}
							}
							
							if matchScore > 0 {
								log.Printf("[DOCUMENSO] Found potential tenant match based on name pattern: %s", r.Email)
								tenantSigningURL = r.SigningURL
								break
							}
						}
					} else if strings.Contains(tenantName, recipientName) || strings.Contains(recipientName, tenantName) {
						// Direct substring match
						log.Printf("[DOCUMENSO] Found potential tenant match based on direct name similarity: %s", r.Email)
						tenantSigningURL = r.SigningURL
						break
					}
				}
			}
			
			// If we still haven't found a match, try a more aggressive approach
			if tenantSigningURL == "" {
				// When all else fails, if there are exactly two recipients and one is the landlord,
				// assume the other is the tenant
				if len(result.Recipients) == 2 && landlordSigningURL != "" {
					// Find the one that's not the landlord
					for _, r := range result.Recipients {
						if !strings.EqualFold(r.Email, landlordEmail) {
							log.Printf("[DOCUMENSO] Using process of elimination: assuming %s is tenant (default match)", r.Email)
							tenantSigningURL = r.SigningURL
							break
						}
					}
				}
			}
		}
	}
	
	// If landlord email not found but there are exactly two recipients
	if landlordSigningURL == "" && len(result.Recipients) == 2 && tenantSigningURL != "" {
		// Find the one that's not the tenant
		for _, r := range result.Recipients {
			if r.SigningURL != tenantSigningURL {
				log.Printf("[DOCUMENSO] Using process of elimination: assuming %s is landlord", r.Email)
				landlordSigningURL = r.SigningURL
				break
			}
		}
	}
	
	if tenantSigningURL != "" && landlordSigningURL != "" {
		log.Printf("[DOCUMENSO] Successfully found signing URLs for both tenant and landlord")
		return tenantSigningURL, landlordSigningURL, nil
	}
	
	// Detailed error information
	if tenantSigningURL == "" && landlordSigningURL == "" {
		return "", "", fmt.Errorf("neither tenant (%s) nor landlord (%s) emails found in document %s recipients", 
			tenantEmail, landlordEmail, documentID)
	} else if tenantSigningURL == "" {
		return "", "", fmt.Errorf("tenant %s not found in document %s (recipients: %v)", 
			tenantEmail, documentID, recipientEmails(result.Recipients))
	} else {
		return "", "", fmt.Errorf("landlord %s not found in document %s (recipients: %v)", 
			landlordEmail, documentID, recipientEmails(result.Recipients))
	}
}

// Helper function to extract just the emails from recipients for error messages
func recipientEmails(recipients []struct {
	Email      string `json:"email"`
	SigningURL string `json:"signingUrl"`
}) []string {
	emails := make([]string, len(recipients))
	for i, r := range recipients {
		emails[i] = r.Email
	}
	return emails
}

// SendDocument sends an existing document for signing through Documenso
// Returns a map of email addresses to signing URLs
func (c *DocumensoClient) SendDocument(documentID string) (map[string]string, error) {
	log.Printf("[DOCUMENSO] Sending document %s for signing", documentID)
	
	// Convert string ID to int if needed
	var documentIDInt int
	if id, err := strconv.Atoi(documentID); err == nil {
		documentIDInt = id
	} else {
		return nil, fmt.Errorf("invalid document ID format: %s", documentID)
	}
	
	// Construct the send URL
	sendURL := fmt.Sprintf("%s/documents/%d/send", c.BaseURL, documentIDInt)
	log.Printf("[DOCUMENSO] Send URL: %s", sendURL)
	
	// Create the request with empty JSON body - no parameters needed for simple sending
	sendReq, err := http.NewRequest("POST", sendURL, bytes.NewBufferString("{}"))
	if err != nil {
		return nil, fmt.Errorf("failed to create send request: %w", err)
	}
	sendReq.Header.Set("Authorization", "Bearer "+c.ApiKey)
	sendReq.Header.Set("Content-Type", "application/json")
	
	// Execute the request
	sendResp, err := c.Client.Do(sendReq)
	if err != nil {
		return nil, fmt.Errorf("send request failed: %w", err)
	}
	defer sendResp.Body.Close()
	
	// Read response body for debugging
	respBody, _ := io.ReadAll(sendResp.Body)
	log.Printf("[DOCUMENSO] Send response: %s", string(respBody))
	
	// Check for success
	if sendResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("document send failed with status: %d, response: %s", 
			sendResp.StatusCode, string(respBody))
	}
	
	// Parse the response to extract signing URLs
	var sendResponse struct {
		DocumentID int `json:"documentId"`
		Recipients []struct {
			RecipientId int    `json:"recipientId"`
			Email       string `json:"email"`
			Name        string `json:"name"`
			SigningURL  string `json:"signingUrl"`
		} `json:"recipients"`
	}
	
	if err := json.Unmarshal(respBody, &sendResponse); err != nil {
		return nil, fmt.Errorf("failed to parse send response: %w", err)
	}
	
	// Map emails to signing URLs
	signingURLs := make(map[string]string)
	for _, r := range sendResponse.Recipients {
		log.Printf("[DOCUMENSO] Recipient %s has signing URL: %s", r.Email, r.SigningURL)
		signingURLs[strings.ToLower(r.Email)] = r.SigningURL
	}
	
	return signingURLs, nil
}

// GetDocumentDownloadURL retrieves the URL to download a document from Documenso
func (c *DocumensoClient) GetDocumentDownloadURL(documentID string) (string, error) {
	// First, get the download URL for the document
	downloadURL := fmt.Sprintf("%s/documents/%s/download", c.BaseURL, documentID)
	c.debugLog("Getting download URL: %s", downloadURL)

	req, err := http.NewRequest("GET", downloadURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create download request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.ApiKey)

	// Send the request
	resp, err := c.Client.Do(req)
	if err != nil {
		return "", fmt.Errorf("download URL request failed: %w", err)
	}
	defer resp.Body.Close()

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API returned status: %d, response: %s", resp.StatusCode, string(body))
	}

	// Parse the response to get the actual download URL
	var response struct {
		DownloadURL string `json:"downloadUrl"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("failed to parse download URL response: %w", err)
	}

	return response.DownloadURL, nil
}

func (c *DocumensoClient) debugLog(format string, args ...interface{}) {
	log.Printf("DOCUMENSO DEBUG: "+format, args...)
}

// MaskSecret redacts most of the secret for logging, keeping only first few chars
// Exported for use in other packages
func MaskSecret(secret string) string {
	if len(secret) <= 4 {
		return "****"
	}
	return secret[:4] + "..."
}

// DocumensoConfig holds the configuration for Documenso integration
type DocumensoConfig struct {
	ApiKey        string `json:"apiKey"`
	WebhookSecret string `json:"webhookSecret"`
}

// UpdateDocumensoConfig handles updating the Documenso configuration
func UpdateDocumensoConfig(w http.ResponseWriter, r *http.Request) {
	log.Println("[DOCUMENSO_CONFIG] Updating Documenso configuration")

	// Read the request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[DOCUMENSO_CONFIG] Error reading request body: %v", err)
		http.Error(w, "Error reading request body", http.StatusBadRequest)
		return
	}

	// Parse the JSON body
	var config DocumensoConfig
	if err := json.Unmarshal(body, &config); err != nil {
		log.Printf("[DOCUMENSO_CONFIG] Error parsing JSON: %v", err)
		http.Error(w, "Error parsing JSON", http.StatusBadRequest)
		return
	}

	// Validate the config
	if config.ApiKey == "" || config.WebhookSecret == "" {
		log.Println("[DOCUMENSO_CONFIG] API key or webhook secret is empty")
		http.Error(w, "API key and webhook secret are required", http.StatusBadRequest)
		return
	}

	// Save the configuration to environment variables
	os.Setenv("DOCUMENSO_API_KEY", config.ApiKey)
	os.Setenv("DOCUMENSO_WEBHOOK_SECRET", config.WebhookSecret)

	log.Printf("[DOCUMENSO_CONFIG] Updated API key to %s and webhook secret to %s",
		MaskSecret(config.ApiKey), MaskSecret(config.WebhookSecret))

	// Write the config to a .env file or similar if needed
	// This is optional and depends on your deployment strategy

	// Send a success response
	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	response := map[string]string{"status": "success", "message": "Documenso configuration updated successfully"}
	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("[DOCUMENSO_CONFIG] Error encoding response: %v", err)
		http.Error(w, "Error encoding response", http.StatusInternalServerError)
	}
}
