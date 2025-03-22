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

// type documensoSendResponse struct {
// 	DocumentID int `json:"documentId"`
// 	Recipients []struct {
// 		Email      string `json:"email"`
// 		SigningURL string `json:"signingUrl"`
// 	} `json:"recipients"`
// }

// DocumensoClientInterface defines interactions with the Documenso API
type DocumensoClientInterface interface {
	UploadDocument(pdfData []byte, title string) (string, error)

	UploadDocumentWithSigners(pdfData []byte, title string, signers []Signer) (string, error)
	SetField(documentID, field, value string) error
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

// UploadDocumentWithSigners uploads a document and assigns signers
func (c *DocumensoClient) UploadDocumentWithSigners(
	pdfData []byte,
	title string,
	signers []Signer,
) (string, map[string]string, error) {
	// Step 1: Create document with recipients
	createDocumentURL := fmt.Sprintf("%s/documents", c.BaseURL)
	log.Println("Creating document with signers:", createDocumentURL)

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
		return "", nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	log.Printf("📌 Request payload:\n%s", string(requestBodyJSON))

	req, err := http.NewRequest("POST", createDocumentURL, bytes.NewBuffer(requestBodyJSON))
	if err != nil {
		return "", nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.Client.Do(req)
	if err != nil {
		return "", nil, fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", nil, fmt.Errorf("API returned status: %d, response: %s", resp.StatusCode, string(body))
	}

	var response struct {
		UploadURL  string `json:"uploadUrl"`
		DocumentID int    `json:"documentId"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", nil, fmt.Errorf("failed to parse response: %w", err)
	}

	log.Printf("📌 Documenso Upload URL: %s", response.UploadURL)

	// Step 2: Upload the PDF
	uploadReq, err := http.NewRequest("PUT", response.UploadURL, bytes.NewReader(pdfData))
	if err != nil {
		return "", nil, fmt.Errorf("failed to create upload request: %w", err)
	}
	uploadReq.Header.Set("Content-Type", "application/pdf")

	uploadResp, err := http.DefaultClient.Do(uploadReq)
	if err != nil {
		return "", nil, fmt.Errorf("upload request failed: %w", err)
	}
	defer uploadResp.Body.Close()

	body, err := io.ReadAll(uploadResp.Body)
	if err != nil {
		log.Printf("❌ Error reading upload response body: %v", err)
	} else {
		log.Printf("📌 Documenso Upload Response: Status %d, Body: %s", uploadResp.StatusCode, string(body))
	}

	if uploadResp.StatusCode != http.StatusOK {
		return "", nil, fmt.Errorf("upload failed with status: %d, response: %s", uploadResp.StatusCode, string(body))
	}

	// Step 3: Send the document
	sendURL := fmt.Sprintf("%s/documents/%d/send", c.BaseURL, response.DocumentID)
	log.Printf("🚀 Sending document for signing: %s", sendURL)

	sendReq, err := http.NewRequest("POST", sendURL, bytes.NewBufferString("{}"))
	if err != nil {
		return "", nil, fmt.Errorf("failed to create send request: %w", err)
	}
	sendReq.Header.Set("Authorization", "Bearer "+c.ApiKey)
	sendReq.Header.Set("Content-Type", "application/json")

	sendResp, err := c.Client.Do(sendReq)
	if err != nil {
		return "", nil, fmt.Errorf("send request failed: %w", err)
	}
	defer sendResp.Body.Close()

	var sendResponse struct {
		DocumentID int `json:"documentId"`
		Recipients []struct {
			Email      string `json:"email"`
			SigningURL string `json:"signingUrl"`
		} `json:"recipients"`
	}

	if err := json.NewDecoder(sendResp.Body).Decode(&sendResponse); err != nil {
		body, _ := io.ReadAll(sendResp.Body)
		return "", nil, fmt.Errorf("failed to decode send response: %s", string(body))
	}

	signingLinks := make(map[string]string)
	for _, r := range sendResponse.Recipients {
		log.Printf("🔗 Signing URL for %s: %s", r.Email, r.SigningURL)
		signingLinks[r.Email] = r.SigningURL
	}

	log.Printf("✅ Document %d successfully created and sent!", response.DocumentID)
	return fmt.Sprintf("%d", response.DocumentID), signingLinks, nil
}

// SetField updates a form field in a document
func (c *DocumensoClient) SetField(documentID, field, value string) error {
	log.Printf("📌 Setting field: %s = %s for document: %s", field, value, documentID)

	// Step 1: Check if the document exists
	exists, err := c.VerifyDocumentExists(documentID)
	if err != nil {
		return fmt.Errorf("failed to verify document exists: %w", err)
	}
	if !exists {
		return fmt.Errorf("document %s not found in Documenso", documentID)
	}

	// Step 2: Get the document to find the first recipient
	url := fmt.Sprintf("%s/documents/%s", c.BaseURL, documentID)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create document fetch request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)

	resp, err := c.Client.Do(req)
	if err != nil {
		return fmt.Errorf("API request to get document failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Get document API returned status: %d, response: %s", resp.StatusCode, string(body))
	}

	// Parse response to get recipients
	var docResponse struct {
		Recipients []struct {
			ID int `json:"id"`
		} `json:"recipients"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&docResponse); err != nil {
		return fmt.Errorf("failed to parse document response: %w", err)
	}

	if len(docResponse.Recipients) == 0 {
		return fmt.Errorf("document has no recipients")
	}

	recipientID := docResponse.Recipients[0].ID
	log.Printf("Using recipient ID: %d for field: %s", recipientID, field)

	// Step 3: Define positioning for fields
	pageNumber := 1
	pageX := 50.0
	pageY := 50.0
	pageWidth := 50.0
	pageHeight := 20.0

	// Adjust positioning based on field type
	// Replace the switch-case block in the SetField function with this improved positioning
	switch field {
	case "agreement_date":
		pageX = 20
		pageY = 20
	case "landlord_name":
		pageX = 20
		pageY = 40
	case "tenant_name":
		pageX = 20
		pageY = 60
	case "property_address":
		pageX = 20
		pageY = 80
		pageWidth = 100
	case "lease_start_date":
		pageX = 20
		pageY = 100
	case "lease_end_date":
		pageX = 100
		pageY = 100
	case "rent_amount":
		pageX = 20
		pageY = 120
	case "security_deposit":
		pageX = 20
		pageY = 140
	default:
		pageX = 20
		pageY = 160
	}

	// Construct field payload according to the API documentation
	payload := map[string]interface{}{
		"recipientId": recipientID,
		"type":        "TEXT",
		"pageNumber":  pageNumber,
		"pageX":       pageX,
		"pageY":       pageY,
		"pageWidth":   pageWidth,
		"pageHeight":  pageHeight,
		"fieldMeta": map[string]interface{}{
			"type":     "text",
			"label":    field,
			"text":     value,
			"fontSize": 10,
			"required": false,
			"readOnly": true,
		},
	}

	// Step 5: Send request to create field
	requestJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal field payload: %w", err)
	}

	apiURL := fmt.Sprintf("%s/documents/%s/fields", c.BaseURL, documentID)
	c.debugLog("Sending field creation request to: %s", apiURL)

	req, err = http.NewRequest("POST", apiURL, bytes.NewBuffer(requestJSON))
	if err != nil {
		return fmt.Errorf("failed to create field request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err = c.Client.Do(req)
	if err != nil {
		return fmt.Errorf("field API request failed: %w", err)
	}
	defer resp.Body.Close()

	// Step 6: Handle response
	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		c.debugLog("Error response for field %s: %s", field, string(respBody))
		return fmt.Errorf("API returned status: %d, response: %s", resp.StatusCode, string(respBody))
	}

	// Modified to handle array response format
	var responseBody struct {
		Fields json.RawMessage `json:"fields"`
	}

	respBody, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(respBody, &responseBody); err != nil {
		return fmt.Errorf("failed to parse field response: %w", err)
	}

	c.debugLog("Successfully set field %s for document %s", field, documentID)
	return nil
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

// AddSignatureField adds a signature field to a document for a specific recipient with retries
func (c *DocumensoClient) AddSignatureField(docID string, recipientID int, x, y, width, height float64) error {
	maxRetries := 3

	for attempt := 0; attempt < maxRetries; attempt++ {
		// Create payload matching Documenso's API spec
		payload := map[string]interface{}{
			"recipientId": recipientID,
			"type":        "SIGNATURE",
			"pageNumber":  1, // First page
			"pageX":       x,
			"pageY":       y,
			"pageWidth":   width,
			"pageHeight":  height,
		}

		// Send the request
		requestJSON, err := json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("failed to marshal payload: %v", err)
		}

		apiURL := fmt.Sprintf("%s/documents/%s/fields", c.BaseURL, docID)
		log.Printf("Creating signature field (attempt %d/%d) at %s",
			attempt+1, maxRetries, apiURL)

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
		log.Printf("Signature field creation response: %s", string(respBody))

		if resp.StatusCode == http.StatusOK {
			log.Printf("Successfully created signature field for recipient %d", recipientID)
			return nil
		}

		// If not successful, retry after delay
		if attempt < maxRetries-1 {
			log.Printf("Failed to create signature field (status %d). Retrying in %d seconds...",
				resp.StatusCode, attempt+1)
			time.Sleep(time.Duration(attempt+1) * time.Second)
			continue
		}

		return fmt.Errorf("failed to create signature field after %d attempts: status %d, response: %s",
			maxRetries, resp.StatusCode, string(respBody))
	}

	return fmt.Errorf("failed to create signature field after %d attempts", maxRetries)
}
func (c *DocumensoClient) debugLog(format string, args ...interface{}) {
	log.Printf("DOCUMENSO DEBUG: "+format, args...)
}
