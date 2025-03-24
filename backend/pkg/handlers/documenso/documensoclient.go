package documenso

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
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
		Client:  &http.Client{Timeout: 30 * time.Second},
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
	log.Println("Creating document with signers:", createDocumentURL)
	//this should ideally be done after the documenso signing webhook not here
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

		payload["fieldMeta"] = map[string]interface{}{
			"color": "#000000",
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

func (c *DocumensoClient) GetTenantSigningURL(documentID string, tenantEmail string) (string, error) {
	url := fmt.Sprintf("%s/documents/%s", c.BaseURL, documentID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)

	resp, err := c.Client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("Documenso returned %d: %s", resp.StatusCode, string(body))
	}

	var result struct {
		Recipients []struct {
			Email      string `json:"email"`
			SigningURL string `json:"signingUrl"`
		} `json:"recipients"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	for _, r := range result.Recipients {
		if strings.EqualFold(r.Email, tenantEmail) {
			return r.SigningURL, nil
		}
	}

	return "", fmt.Errorf("tenant %s not found in document %s", tenantEmail, documentID)
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
