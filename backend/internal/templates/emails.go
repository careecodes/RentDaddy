package templates

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
)

// getLogoURL returns the URL for the RentDaddy logo
// This is a central function to ensure consistent logo URL construction
func getLogoURL() string {
	// Try to get logo URL from environment
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		// Try to derive from backend URL
		backendURL := os.Getenv("BACKEND_URL")
		if backendURL != "" {
			// Extract domain from backend URL
			backendDomain := strings.TrimPrefix(strings.TrimPrefix(backendURL, "https://"), "http://")
			// Remove "api." prefix if present - using TrimPrefix for simplicity
			backendDomain = strings.TrimPrefix(backendDomain, "api.")
			frontendURL = "https://app." + backendDomain
		} else {
			// Try additional environment variables
			frontendURL = os.Getenv("VITE_FRONTEND_URL")
			if frontendURL == "" {
				// Default fallback
				frontendURL = "https://app.curiousdev.net"
			}
		}
	}

	// Ensure frontendURL has a protocol
	if !strings.HasPrefix(frontendURL, "http") {
		frontendURL = "https://" + frontendURL
	}

	// Ensure no trailing slash
	frontendURL = strings.TrimSuffix(frontendURL, "/")

	return frontendURL + "/logo.png"
}

// Use EmailTemplateData from manager.go

// Email handling functions
var DefaultManager *EmailTemplateManager

// InitializeDefaultManager sets up the global template manager
func InitializeDefaultManager() error {
	// Get logo URL using the helper function
	logoURL := getLogoURL()
	log.Printf("Email template manager initializing with logo URL: %s", logoURL)

	// Look for templates in a standard location
	templatePath := filepath.Join("internal", "templates", "emails")
	if _, err := os.Stat(templatePath); os.IsNotExist(err) {
		// Try alternate path
		templatePath = filepath.Join(".", "internal", "templates", "emails")
		if _, err := os.Stat(templatePath); os.IsNotExist(err) {
			return fmt.Errorf("template directory not found at %s or %s",
				filepath.Join("internal", "templates", "emails"),
				filepath.Join(".", "internal", "templates", "emails"))
		}
	}

	var err error
	DefaultManager, err = NewEmailTemplateManager(templatePath)
	return err
}

// RenderSignRequestEmail renders the signing request email template
func RenderSignRequestEmail(recipientName, documentTitle, signingURL string) (string, string, error) {
	if DefaultManager == nil {
		if err := InitializeDefaultManager(); err != nil {
			return getFallbackSignRequestEmail(recipientName, documentTitle, signingURL),
				"Please sign your RentDaddy lease agreement", nil
		}
	}

	data := EmailTemplateData{
		RecipientName: recipientName,
		DocumentTitle: documentTitle,
		SigningURL:    signingURL,
	}

	html, err := DefaultManager.RenderTemplate("sign_request", data)
	if err != nil {
		return getFallbackSignRequestEmail(recipientName, documentTitle, signingURL),
			"Please sign your RentDaddy lease agreement", nil
	}

	subject := DefaultManager.GetTemplateSubject("sign_request")
	return html, subject, nil
}

// RenderSigningCompleteEmail renders the signing complete email template
func RenderSigningCompleteEmail(recipientName, documentTitle, downloadURL string) (string, string, error) {
	if DefaultManager == nil {
		if err := InitializeDefaultManager(); err != nil {
			return getFallbackSigningCompleteEmail(recipientName, documentTitle, downloadURL),
				"Your RentDaddy lease agreement has been signed", nil
		}
	}

	data := EmailTemplateData{
		RecipientName: recipientName,
		DocumentTitle: documentTitle,
		DownloadURL:   downloadURL,
	}

	html, err := DefaultManager.RenderTemplate("signing_complete", data)
	if err != nil {
		return getFallbackSigningCompleteEmail(recipientName, documentTitle, downloadURL),
			"Your RentDaddy lease agreement has been signed", nil
	}

	subject := DefaultManager.GetTemplateSubject("signing_complete")
	return html, subject, nil
}

// Fallback templates
func getFallbackSignRequestEmail(recipientName, documentTitle, signingURL string) string {
	// Get logo URL using the helper function
	logoURL := getLogoURL()

	// Log that we're using fallback template
	log.Printf("Using fallback sign request email template with URL: %s and logo: %s", signingURL, logoURL)

	// Ensure the signing URL is not empty
	if signingURL == "" {
		log.Printf("WARNING: Empty signing URL in email template")
		signingURL = "#missing-url" // Provide fallback to avoid broken links
	}

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .logo { max-width: 150px; }
    .button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="%s" alt="RentDaddy Logo" class="logo">
      <h2>Your Lease Agreement is Ready to Sign</h2>
    </div>
    
    <p>Hello %s,</p>
    
    <p>Your lease agreement <strong>"%s"</strong> is ready for your signature.</p>
    
    <p>Please review the document carefully before signing. Once all parties have signed, you'll receive a final copy of the completed document.</p>
    
    <div style="text-align: center;">
      <a href="%s" class="button">Sign Document Now</a>
    </div>
    
    <p>If you have any questions about this document, please contact your property manager.</p>
    
    <p>Thank you,<br>
    The RentDaddy Team</p>
    
    <div class="footer">
      <p>© 2025 RentDaddy - Making property management easy</p>
    </div>
  </div>
</body>
</html>`, logoURL, recipientName, documentTitle, signingURL)
}

func getFallbackSigningCompleteEmail(recipientName, documentTitle, downloadURL string) string {
	// Get logo URL using the helper function
	logoURL := getLogoURL()

	log.Printf("Using fallback signing complete email template with logo: %s", logoURL)

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .logo { max-width: 150px; }
    .success-icon { font-size: 48px; color: #4CAF50; text-align: center; margin: 20px 0; }
    .button { display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="%s" alt="RentDaddy Logo" class="logo">
      <h2>Lease Agreement Completed!</h2>
    </div>
    
    <div class="success-icon">✓</div>
    
    <p>Hello %s,</p>
    
    <p>Great news! Your lease agreement <strong>"%s"</strong> has been signed by all parties and is now complete.</p>
    
    <p>You can access the signed document through your RentDaddy account or by clicking the button below.</p>
    
    <div style="text-align: center;">
      <a href="%s" class="button">Download Signed Document</a>
    </div>
    
    <p>If you have any questions about this document, please contact your property manager.</p>
    
    <p>Thank you,<br>
    The RentDaddy Team</p>
    
    <div class="footer">
      <p>© 2025 RentDaddy - Making property management easy</p>
    </div>
  </div>
</body>
</html>`, logoURL, recipientName, documentTitle, downloadURL)
}

// getDocumensoLogoURL returns the URL for the Documenso logo
// This is used specifically for verification emails that are forwarded
// from Documenso directly
func getDocumensoLogoURL() string {
	docsURL := os.Getenv("DOCUMENSO_PUBLIC_URL")
	if docsURL == "" {
		// Get domain from environment
		domain := os.Getenv("DOMAIN_URL")
		if domain == "" || domain == "http://localhost" {
			domain = "docs.curiousdev.net"
		}

		// Extract just the domain part
		if strings.HasPrefix(domain, "http://") {
			domain = strings.TrimPrefix(domain, "http://")
		} else if strings.HasPrefix(domain, "https://") {
			domain = strings.TrimPrefix(domain, "https://")
		}

		docsURL = "https://" + domain
	}

	// Ensure no trailing slash
	docsURL = strings.TrimSuffix(docsURL, "/")

	logoURL := docsURL + "/logo.png"
	return logoURL
}

// RenderVerificationEmail renders the email verification template
func RenderVerificationEmail(verificationURL string) (string, string, error) {
	if DefaultManager == nil {
		if err := InitializeDefaultManager(); err != nil {
			return getFallbackVerificationEmail(verificationURL),
				"Please confirm your Documenso email address", nil
		}
	}

	// Verify that the verificationURL has a token
	if verificationURL == "" || !strings.Contains(verificationURL, "/verify-email/") {
		log.Printf("WARNING: Invalid verification URL detected: %s", verificationURL)
		return "", "", fmt.Errorf("invalid verification URL: missing token")
	}

	// For verification email, we use Documenso logo since this is forwarded from Documenso
	logoURL := getDocumensoLogoURL()
	log.Printf("Using Documenso logo URL for verification email: %s", logoURL)

	data := EmailTemplateData{
		VerificationURL: verificationURL,
		LogoURL:         logoURL,
	}

	html, err := DefaultManager.RenderTemplate("verification_email", data)
	if err != nil {
		return getFallbackVerificationEmail(verificationURL),
			"Please confirm your Documenso email address", nil
	}

	subject := DefaultManager.GetTemplateSubject("verification_email")
	return html, subject, nil
}

// Fallback template for verification emails
func getFallbackVerificationEmail(verificationURL string) string {
	// Ensure the verification URL is not empty
	if verificationURL == "" {
		log.Printf("WARNING: Empty verification URL in email template")
		verificationURL = "#missing-verification-url" // Provide a fallback
	}

	// Get logo URL - use Documenso URL for this specific email
	// as it's forwarded from Documenso
	logoURL := getDocumensoLogoURL()
	log.Printf("Using Documenso logo URL for verification email: %s", logoURL)

	// Log that we're using the fallback template
	log.Printf("Using fallback verification email template with URL: %s", verificationURL)

	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .logo { max-width: 150px; }
    .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; 
              text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
    .footer { margin-top: 30px; font-size: 12px; color: #777; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="%s" alt="Documenso Logo" class="logo">
      <h2>Please Verify Your Email Address</h2>
    </div>
    
    <p>Hello!</p>
    
    <p>Thanks for signing up for Documenso! Please confirm your email address by clicking the button below.</p>
    
    <div style="text-align: center;">
      <a href="%s" class="button">Verify Email Address</a>
    </div>
    
    <p style="margin-top: 20px;">Or copy and paste this URL into your browser:</p>
    <p style="word-break: break-all; color: #4F46E5;"><a href="%s">%s</a></p>
    
    <p>If you didn't sign up for Documenso, you can ignore this email.</p>
    
    <p>Thank you,<br>
    The Documenso Team</p>
    
    <div class="footer">
      <p>Documenso - The open-source document signing platform</p>
    </div>
  </div>
</body>
</html>`, logoURL, verificationURL, verificationURL, verificationURL)
}
