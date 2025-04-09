# Implementation Guide for Email Templates

This document provides a guide for implementing the email templates system in the documenso-worker.

## Changes to Make in `main.go`

1. Add the required imports:
   ```go
   import (
       // Existing imports
       "html/template"
       "io/ioutil"
       "path/filepath"
   )
   ```

2. Add the template-related types:
   ```go
   // TemplateConfig holds configuration for email templates
   type TemplateConfig struct {
       Templates map[string]TemplateInfo `json:"templates"`
   }

   // TemplateInfo stores metadata about a template
   type TemplateInfo struct {
       Filename string `json:"filename"`
       Subject  string `json:"subject"`
   }

   // TemplateData holds the data for email template rendering
   type TemplateData struct {
       LogoURL        string
       RecipientName  string
       DocumentTitle  string
       SigningURL     string
       DownloadURL    string
   }

   // EmailTemplateManager loads and manages email templates
   type EmailTemplateManager struct {
       Config    TemplateConfig
       Templates map[string]*template.Template
       BasePath  string
       LogoURL   string
   }
   ```

3. Add the template manager methods:
   ```go
   // NewEmailTemplateManager creates a new template manager
   func NewEmailTemplateManager(basePath, logoURL string) (*EmailTemplateManager, error) {
       manager := &EmailTemplateManager{
           BasePath:  basePath,
           Templates: make(map[string]*template.Template),
           LogoURL:   logoURL,
       }

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
   func (m *EmailTemplateManager) RenderTemplate(name string, data TemplateData) (string, error) {
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
   ```

4. In the main function, initialize the template manager:
   ```go
   // Initialize email template manager
   templatePath := filepath.Join(".", "templates")
   templateManager, err := NewEmailTemplateManager(templatePath, logoURL)
   if err != nil {
       log.Printf("Warning: Failed to initialize email template manager: %v", err)
       log.Printf("Will fall back to in-memory templates if needed")
   } else {
       log.Printf("Successfully loaded email templates from %s", templatePath)
   }
   ```

5. In the processJobs function, where email templates are used, replace the hardcoded template with:
   ```go
   // Create HTML email templates
   var signRequestHTML, signingCompleteHTML string
   var signRequestSubject, signingCompleteSubject string
   
   // Try to use the template manager if available
   if templateManager != nil {
       // Extract document info for template data
       documentTitle := "Lease Agreement"
       if dt, ok := payloadData["title"].(string); ok && dt != "" {
           documentTitle = dt
       }
       
       // Recipient data
       recipientName := "Tenant"
       if len(recipients) > 0 && recipients[0]["name"] != nil {
           if rn, ok := recipients[0]["name"].(string); ok && rn != "" {
               recipientName = rn
           }
       }
       
       // Signing URL
       signingURL := "#"
       if len(recipients) > 0 && recipients[0]["signing_url"] != nil {
           if su, ok := recipients[0]["signing_url"].(string); ok && su != "" {
               signingURL = su
           }
       }
       
       // Download URL - may be configured later
       downloadURL := "#"
       
       // Prepare template data
       templateData := TemplateData{
           LogoURL:        logoURL,
           RecipientName:  recipientName,
           DocumentTitle:  documentTitle,
           SigningURL:     signingURL,
           DownloadURL:    downloadURL,
       }
       
       // Render sign request template
       html, err := templateManager.RenderTemplate("sign_request", templateData)
       if err != nil {
           log.Printf("Error rendering sign_request template: %v", err)
       } else {
           signRequestHTML = html
           signRequestSubject = templateManager.GetTemplateSubject("sign_request")
       }
       
       // Render signing complete template
       html, err = templateManager.RenderTemplate("signing_complete", templateData)
       if err != nil {
           log.Printf("Error rendering signing_complete template: %v", err)
       } else {
           signingCompleteHTML = html
           signingCompleteSubject = templateManager.GetTemplateSubject("signing_complete")
       }
   }
   
   // Fall back to built-in templates if needed
   if signRequestHTML == "" {
       // For backwards compatibility and fallback
       signRequestSubject = "Please sign your RentDaddy lease agreement"
       signRequestHTML = fmt.Sprintf(/* existing template */)
   }
   
   if signingCompleteHTML == "" {
       // For backwards compatibility and fallback
       signingCompleteSubject = "Your RentDaddy lease agreement has been signed"
       signingCompleteHTML = fmt.Sprintf(/* existing template */)
   }
   
   // Add the templated emails to the payload
   payloadData["email_templates"] = map[string]interface{}{
       "sign_request": map[string]interface{}{
           "subject": signRequestSubject,
           "body_html": signRequestHTML,
       },
       "signing_complete": map[string]interface{}{
           "subject": signingCompleteSubject,
           "body_html": signingCompleteHTML,
       }
   }
   ```

## Troubleshooting

If you encounter Go build errors:

1. Make sure your imports are correct
2. Check for syntax errors in the template manager implementation
3. Ensure all template-related structs are correctly defined
4. Verify that the template initialization in main() is correct

For template loading issues:

1. Check that the template path is correct
2. Verify that config.json has the correct format
3. Make sure the template files exist and are accessible
4. Check log output for specific error messages