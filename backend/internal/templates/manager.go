package templates

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"io/ioutil"
	"log"
	"path/filepath"
)

// TemplateConfig holds configuration for email templates
type TemplateConfig struct {
	Templates map[string]TemplateInfo `json:"templates"`
}

// TemplateInfo stores metadata about a template
type TemplateInfo struct {
	Filename string `json:"filename"`
	Subject  string `json:"subject"`
}

// EmailTemplateData holds the data for email template rendering
type EmailTemplateData struct {
	LogoURL         string
	RecipientName   string
	DocumentTitle   string
	SigningURL      string
	DownloadURL     string
	VerificationURL string
	AdditionalData  map[string]interface{}
}

// EmailTemplateManager loads and manages email templates
type EmailTemplateManager struct {
	Config    TemplateConfig
	Templates map[string]*template.Template
	BasePath  string
	LogoURL   string
}

// NewEmailTemplateManager creates a new template manager
func NewEmailTemplateManager(basePath string) (*EmailTemplateManager, error) {
	manager := &EmailTemplateManager{
		BasePath:  basePath,
		Templates: make(map[string]*template.Template),
	}

	// Use the helper function to get the logo URL
	manager.LogoURL = getLogoURL()
	log.Printf("Email template manager initialized with logo URL: %s", manager.LogoURL)

	// Load template configuration
	configPath := filepath.Join(basePath, "config.json")
	configData, err := ioutil.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("error reading template config: %v", err)
	}

	if err := json.Unmarshal(configData, &manager.Config); err != nil {
		return nil, fmt.Errorf("error parsing template config: %v", err)
	}

	// Load all templates
	for name, info := range manager.Config.Templates {
		templatePath := filepath.Join(basePath, info.Filename)
		tmpl, err := template.ParseFiles(templatePath)
		if err != nil {
			return nil, fmt.Errorf("error loading template %s: %v", name, err)
		}
		manager.Templates[name] = tmpl
	}

	return manager, nil
}

// RenderTemplate renders a template with the given data
func (m *EmailTemplateManager) RenderTemplate(name string, data EmailTemplateData) (string, error) {
	tmpl, exists := m.Templates[name]
	if !exists {
		return "", fmt.Errorf("template %s not found", name)
	}

	// Ensure logo URL is set
	if data.LogoURL == "" {
		data.LogoURL = m.LogoURL
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("error rendering template %s: %v", name, err)
	}

	return buf.String(), nil
}

// GetTemplateSubject returns the subject for a template
func (m *EmailTemplateManager) GetTemplateSubject(name string) string {
	info, exists := m.Config.Templates[name]
	if !exists {
		return "RentDaddy Notification"
	}
	return info.Subject
}

// LoadOrDefault creates an EmailTemplateManager, falling back to default behavior if loading fails
func LoadOrDefault(basePath string) *EmailTemplateManager {
	manager, err := NewEmailTemplateManager(basePath)
	if err != nil {
		log.Printf("Warning: Failed to initialize email template manager: %v", err)
		log.Printf("Using default in-memory templates")

		// Create a minimal in-memory manager with no templates
		defaultManager := &EmailTemplateManager{
			BasePath:  basePath,
			Templates: make(map[string]*template.Template),
			Config: TemplateConfig{
				Templates: make(map[string]TemplateInfo),
			},
		}

		// Use the helper function to get the logo URL
		defaultManager.LogoURL = getLogoURL()
		log.Printf("Default email template manager initialized with logo URL: %s", defaultManager.LogoURL)

		return defaultManager
	}

	return manager
}
