package documenso

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"
)

// DocumensoClient handles interactions with the Documenso API
type DocumensoClient struct {
	BaseURL string
	ApiKey  string
	Client  *http.Client
}

// NewDocumensoClient creates a new Documenso API client
func NewDocumensoClient(baseURL, apiKey string) *DocumensoClient {
	return &DocumensoClient{
		BaseURL: baseURL,
		ApiKey:  apiKey,
		Client:  &http.Client{Timeout: 30 * time.Second},
	}
}

// Field represents a signing field in the document
type Field struct {
	Type     string `json:"type"`
	Page     int    `json:"page"`
	Position struct {
		X float64 `json:"x"`
		Y float64 `json:"y"`
	} `json:"position"`
	Size struct {
		Width  float64 `json:"width"`
		Height float64 `json:"height"`
	} `json:"size"`
}

// DocumentCreateRequest defines the request for creating a document
type DocumentCreateRequest struct {
	Title       string  `json:"title"`
	SignerEmail string  `json:"signerEmail"`
	Message     string  `json:"message,omitempty"`
	RedirectURL string  `json:"redirectUrl,omitempty"`
	Fields      []Field `json:"fields,omitempty"`
}

// DocumentCreateResponse defines the response from creating a document
type DocumentCreateResponse struct {
	DocumentID string `json:"documentId"`
	SigningURL string `json:"signingUrl"`
	Status     string `json:"status"`
}

// DocumentStatusResponse defines the response from checking document status
type DocumentStatusResponse struct {
	DocumentID string `json:"documentId"`
	Status     string `json:"status"`
	SigningURL string `json:"signingUrl"`
}

// CreateDocument uploads a PDF and creates a document for signing
func (c *DocumensoClient) CreateDocument(req DocumentCreateRequest, pdfData []byte) (*DocumentCreateResponse, error) {
	// Create a buffer to write our multipart form
	var b bytes.Buffer
	w := multipart.NewWriter(&b)

	// Add the file
	fw, err := w.CreateFormFile("file", "lease.pdf")
	if err != nil {
		return nil, fmt.Errorf("failed to create form file: %w", err)
	}

	if _, err = io.Copy(fw, bytes.NewReader(pdfData)); err != nil {
		return nil, fmt.Errorf("failed to copy file data: %w", err)
	}

	// Add other form fields
	if err = w.WriteField("title", req.Title); err != nil {
		return nil, fmt.Errorf("failed to write title field: %w", err)
	}

	if err = w.WriteField("signerEmail", req.SignerEmail); err != nil {
		return nil, fmt.Errorf("failed to write signerEmail field: %w", err)
	}

	if req.Message != "" {
		if err = w.WriteField("message", req.Message); err != nil {
			return nil, fmt.Errorf("failed to write message field: %w", err)
		}
	}

	if req.RedirectURL != "" {
		if err = w.WriteField("redirectUrl", req.RedirectURL); err != nil {
			return nil, fmt.Errorf("failed to write redirectUrl field: %w", err)
		}
	}

	// Add fields if present
	if len(req.Fields) > 0 {
		fieldsJSON, err := json.Marshal(req.Fields)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal fields: %w", err)
		}

		if err = w.WriteField("fields", string(fieldsJSON)); err != nil {
			return nil, fmt.Errorf("failed to write fields field: %w", err)
		}
	}

	// Close the writer
	if err = w.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer: %w", err)
	}

	// Create request
	httpReq, err := http.NewRequest("POST", c.BaseURL+"/api/documents", &b)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", w.FormDataContentType())
	httpReq.Header.Set("Authorization", "Bearer "+c.ApiKey)

	// Send request
	resp, err := c.Client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %s - %s", resp.Status, string(body))
	}

	// Parse response
	var result DocumentCreateResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}

// GetDocumentStatus retrieves the current status of a document
func (c *DocumensoClient) GetDocumentStatus(documentID string) (*DocumentStatusResponse, error) {
	// Create request
	req, err := http.NewRequest("GET", c.BaseURL+"/api/documents/"+documentID, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Authorization", "Bearer "+c.ApiKey)

	// Send request
	resp, err := c.Client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API error: %s - %s", resp.Status, string(body))
	}

	// Parse response
	var result DocumentStatusResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result, nil
}
