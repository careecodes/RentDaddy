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

// UploadDocument uploads a PDF to Documenso and returns the document ID
func (c *DocumensoClient) UploadDocument(pdfData []byte, title string) (string, error) {
	// Create the document metadata
	createDocumentURL := fmt.Sprintf("%s/documents", c.BaseURL)

	// Prepare JSON request body
	requestBody := map[string]interface{}{
		"title":      title,
		"recipients": []map[string]string{},
	}

	requestBodyJSON, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request body: %w", err)
	}

	// Create request to get the upload URL
	req, err := http.NewRequest("POST", createDocumentURL, bytes.NewBuffer(requestBodyJSON))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.ApiKey)
	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := c.Client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API returned status: %d, response: %s", resp.StatusCode, string(body))
	}

	// Parse response to get upload URL and document ID
	var response struct {
		UploadURL  string `json:"uploadUrl"`
		DocumentID int    `json:"documentId"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	// Step 2: Upload the actual PDF file
	uploadReq, err := http.NewRequest("PUT", response.UploadURL, bytes.NewReader(pdfData))
	if err != nil {
		return "", fmt.Errorf("failed to create upload request: %w", err)
	}

	uploadReq.Header.Set("Content-Type", "application/pdf")

	uploadResp, err := http.DefaultClient.Do(uploadReq) // Using DefaultClient for the upload
	if err != nil {
		return "", fmt.Errorf("upload request failed: %w", err)
	}
	defer uploadResp.Body.Close()

	if uploadResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(uploadResp.Body)
		return "", fmt.Errorf("Upload failed with status: %d, response: %s", uploadResp.StatusCode, string(body))
	}

	return fmt.Sprintf("%d", response.DocumentID), nil
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

// UploadDocumentWithSigners uploads a document to Documenso with specified signers
func (c *DocumensoClient) UploadDocumentWithSigners(pdfData []byte, title string, signers []Signer) (string, error) {
	// Step 1: Create document with recipients
	createDocumentURL := fmt.Sprintf("%s/documents", c.BaseURL)
	log.Println("Creating document with signers:", createDocumentURL)

	// Convert our signers to the format expected by the API
	recipients := make([]map[string]interface{}, len(signers))
	for i, signer := range signers {
		recipients[i] = map[string]interface{}{
			"name":  signer.Name,
			"email": signer.Email,
			"role":  signer.Role,
		}
	}

	// Prepare request body
	requestBody := map[string]interface{}{
		"title":      title,
		"recipients": recipients,
	}

	requestBodyJSON, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request body: %w", err)
	}

	// Create request
	req, err := http.NewRequest("POST", createDocumentURL, bytes.NewBuffer(requestBodyJSON))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.ApiKey)
	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := c.Client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("API returned status: %d, response: %s", resp.StatusCode, string(body))
	}

	// Parse response to get upload URL and document ID
	var response struct {
		UploadURL  string `json:"uploadUrl"`
		DocumentID int    `json:"documentId"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	// Step 2: Upload the actual PDF file
	uploadReq, err := http.NewRequest("PUT", response.UploadURL, bytes.NewReader(pdfData))
	if err != nil {
		return "", fmt.Errorf("failed to create upload request: %w", err)
	}

	uploadReq.Header.Set("Content-Type", "application/pdf")

	uploadResp, err := http.DefaultClient.Do(uploadReq) // Using DefaultClient for the upload
	if err != nil {
		return "", fmt.Errorf("upload request failed: %w", err)
	}
	defer uploadResp.Body.Close()

	if uploadResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(uploadResp.Body)
		return "", fmt.Errorf("Upload failed with status: %d, response: %s", uploadResp.StatusCode, string(body))
	}

	// Step 3: Send the document for signing
	sendURL := fmt.Sprintf("%s/documents/%d/send", c.BaseURL, response.DocumentID)
	sendReq, err := http.NewRequest("POST", sendURL, bytes.NewBufferString("{}"))
	if err != nil {
		return "", fmt.Errorf("failed to create send request: %w", err)
	}

	sendReq.Header.Set("Authorization", "Bearer "+c.ApiKey)
	sendReq.Header.Set("Content-Type", "application/json")

	sendResp, err := c.Client.Do(sendReq)
	if err != nil {
		return "", fmt.Errorf("send request failed: %w", err)
	}
	defer sendResp.Body.Close()

	if sendResp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(sendResp.Body)
		return "", fmt.Errorf("Send failed with status: %d, response: %s", sendResp.StatusCode, string(body))
	}

	return fmt.Sprintf("%d", response.DocumentID), nil
}

// SetField updates a form field in a document
func (c *DocumensoClient) SetField(documentID, field, value string) error {
	url := fmt.Sprintf("%s/documents/%s/fields", c.BaseURL, documentID)

	// Define field positions based on field name
	var (
		pageX  float64 = 140
		pageY  float64
		width  float64 = 160
		height float64 = 30
	)

	// Adjust Y position based on field type
	switch field {
	case "agreement_date":
		pageY = 93
	case "landlord_name":
		pageY = 136
	case "tenant_name":
		pageY = 176
	case "property_address":
		pageY = 226
	case "lease_start_date":
		pageY = 276
		width = 100
		pageX = 120
	case "lease_end_date":
		pageY = 276
		width = 100
		pageX = 280
	case "rent_amount":
		pageY = 326
		width = 100
	case "security_deposit":
		pageY = 376
		width = 100
	case "landlord_signature":
		pageY = 456
	case "landlord_date":
		pageY = 506
	case "tenant_signature":
		pageY = 556
	case "tenant_date":
		pageY = 606
	default:
		// Default placement in the middle of the document
		pageY = 300
	}

	// Create a field to update
	payload := map[string]interface{}{
		"recipientId": 1, // You might need to get the actual recipient ID
		"type":        "TEXT",
		"pageNumber":  1,
		"pageX":       pageX,
		"pageY":       pageY,
		"pageWidth":   width,
		"pageHeight":  height,
		"fieldMeta": map[string]interface{}{
			"type":     "text",
			"label":    field,
			"text":     value,
			"fontSize": 12,
			"required": true,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to encode request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.Client.Do(req)
	if err != nil {
		return fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API returned status: %d, response: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// Helper method to set all lease fields
func (c *DocumensoClient) SetLeaseFields(documentID string, leaseData map[string]string) error {
	for field, value := range leaseData {
		if err := c.SetField(documentID, field, value); err != nil {
			return fmt.Errorf("failed to set field %s: %w", field, err)
		}
	}
	return nil
}

// Example usage:
/*
leaseData := map[string]string{
	"agreement_date":    "March 19, 2025",
	"landlord_name":     "Property Management LLC",
	"tenant_name":       "John Doe",
	"property_address":  "123 Main",
	"lease_start_date":  "April 1, 2025",
	"lease_end_date":    "March 31, 2026",
	"rent_amount":       "1500.00",
	"security_deposit":  "1500.00",
}

err := client.SetLeaseFields(documentID, leaseData)
*/
