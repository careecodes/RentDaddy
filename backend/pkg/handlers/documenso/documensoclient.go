package documenso

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// DocumensoClientInterface defines interactions with the Documenso API
type DocumensoClientInterface interface {
	CreateDocument(pdfData []byte, fields map[string]string) (string, error)
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
	return &DocumensoClient{
		BaseURL: baseURL,
		ApiKey:  apiKey,
		Client:  &http.Client{Timeout: 30 * time.Second},
	}
}

// CreateDocument uploads a lease PDF and applies fields
func (c *DocumensoClient) CreateDocument(pdfData []byte, fields map[string]string) (string, error) {
	url := fmt.Sprintf("%s/api/documents", c.BaseURL)

	payload := map[string]interface{}{
		"pdf":    pdfData,
		"fields": fields,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to encode request: %w", err)
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.Client.Do(req)
	if err != nil {
		return "", fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API returned status: %d", resp.StatusCode)
	}

	var response struct {
		DocumentID string `json:"document_id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	return response.DocumentID, nil
}

// SetField updates a form field in a document
func (c *DocumensoClient) SetField(documentID, field, value string) error {
	url := fmt.Sprintf("%s/api/documents/%s/fields", c.BaseURL, documentID)
	payload := map[string]interface{}{
		"fields": []map[string]string{{"name": field, "value": value}},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to encode request: %w", err)
	}

	req, err := http.NewRequest("PATCH", url, bytes.NewBuffer(body))
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
		return fmt.Errorf("API returned status: %d", resp.StatusCode)
	}

	return nil
}
