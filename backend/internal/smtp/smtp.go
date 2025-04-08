package smtp

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
	"time"
)

type SMTPConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	TLSMode  string
}

func LoadSMTPConfig() (*SMTPConfig, error) {
	host := os.Getenv("SMTP_ENDPOINT_ADDRESS")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	password := os.Getenv("SMTP_PASSWORD")
	tlsMode := os.Getenv("SMTP_TLS_MODE")
	from := os.Getenv("SMTP_FROM")

	if host == "" || port == "" || user == "" || password == "" || tlsMode == "" || from == "" {
		return nil, fmt.Errorf("one or more SMTP configuration variables (SMTP_ENDPOINT_ADDRESS, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_TLS_MODE, SMTP_FROM) must be set")
	}

	if tlsMode != "starttls" && tlsMode != "tls" {
		return nil, fmt.Errorf("Invalid SMTP_TLS_MODE: must be 'starttls' or 'tls'")
	}

	return &SMTPConfig{
		Host:     host,
		Port:     port,
		User:     user,
		Password: password,
		TLSMode:  tlsMode,
	}, nil
}

func SendEmail(to string, subject string, body string) error {
	smtpConfig, err := LoadSMTPConfig()
	if err != nil {
		return fmt.Errorf("failed to load SMTP config: %v", err)
	}

	from := os.Getenv("SMTP_FROM")

	msg := []byte("From: " + from + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"\r\n" +
		body + "\r\n")

	addr := fmt.Sprintf("%s:%s", smtpConfig.Host, smtpConfig.Port)
	auth := smtp.PlainAuth("", smtpConfig.User, smtpConfig.Password, smtpConfig.Host)

	var sendMailErr error
	maxRetries := 3
	for i := 0; i < maxRetries; i++ {
		sendMailErr = smtp.SendMail(addr, auth, from, []string{to}, msg)
		if sendMailErr == nil {
			log.Printf("Sent email to %s", to)
			return nil
		}

		log.Printf("Attempt %d: Failed to send email to %s: %v", i+1, to, sendMailErr)

		waitTime := (1 << i) * 500
		time.Sleep(time.Duration(waitTime) * time.Millisecond)
	}

	return fmt.Errorf("Failed to send email to %s after %d attempts: %v", to, maxRetries, sendMailErr)
}

// SendEmailHTML sends an HTML email with both text and HTML parts
func SendEmailHTML(to string, subject string, textBody string, htmlBody string) error {
	smtpConfig, err := LoadSMTPConfig()
	if err != nil {
		return fmt.Errorf("failed to load SMTP config: %v", err)
	}

	from := os.Getenv("SMTP_FROM")
	boundary := "NextPart_" + fmt.Sprintf("%d", time.Now().UnixNano())

	// Add proper Content-Type header for HTML emails
	// Important: We need to ensure the HTML content has properly formatted attributes
	// with "=" between attribute names and values
	
	// Log a sample of the HTML body to check for attribute format
	if len(htmlBody) > 100 {
		log.Printf("HTML email sample (first 100 chars): %s", htmlBody[:100])
	}

	// Build MIME multipart message with clear boundaries
	msg := []byte("From: " + from + "\r\n" +
		"To: " + to + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: multipart/alternative; boundary=\"" + boundary + "\"\r\n" +
		"\r\n" +
		"--" + boundary + "\r\n" +
		"Content-Type: text/plain; charset=\"utf-8\"\r\n" +
		"Content-Transfer-Encoding: 7bit\r\n" +
		"\r\n" +
		textBody + "\r\n" +
		"\r\n" +
		"--" + boundary + "\r\n" +
		"Content-Type: text/html; charset=\"utf-8\"\r\n" +
		"Content-Transfer-Encoding: 7bit\r\n" +
		"\r\n" +
		htmlBody + "\r\n" +
		"\r\n" +
		"--" + boundary + "--\r\n")

	addr := fmt.Sprintf("%s:%s", smtpConfig.Host, smtpConfig.Port)
	auth := smtp.PlainAuth("", smtpConfig.User, smtpConfig.Password, smtpConfig.Host)

	var sendMailErr error
	maxRetries := 3
	for i := 0; i < maxRetries; i++ {
		sendMailErr = smtp.SendMail(addr, auth, from, []string{to}, msg)
		if sendMailErr == nil {
			log.Printf("Sent HTML email to %s", to)
			return nil
		}

		log.Printf("Attempt %d: Failed to send HTML email to %s: %v", i+1, to, sendMailErr)

		waitTime := (1 << i) * 500
		time.Sleep(time.Duration(waitTime) * time.Millisecond)
	}

	return fmt.Errorf("Failed to send HTML email to %s after %d attempts: %v", to, maxRetries, sendMailErr)
}
