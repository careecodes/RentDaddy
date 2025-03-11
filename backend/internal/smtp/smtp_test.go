package config

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"testing"
)

func TestSMTPConnection(t *testing.T) {
	config, err := LoadSMTPConfig()
	if err != nil {
		t.Fatalf("Failed to load SMTP config: %v", err)
	}

	addr := fmt.Sprintf("%s:%s", config.Host, config.Port)

	if config.TLSMode == "tls" {
		tlsConfig := &tls.Config{
			InsecureSkipVerify: false,
			ServerName:         config.Host,
		}

		conn, err := tls.Dial("tcp", addr, tlsConfig)
		if err != nil {
			t.Fatalf("Failed to connect via TLS: %v", err)
		}
		defer conn.Close()

		client, err := smtp.NewClient(conn, config.Host)
		if err != nil {
			t.Fatalf("Failed to create SMTP client: %v", err)
		}

		auth := smtp.PlainAuth("", config.User, config.Password, config.Host)
		if err := client.Auth(auth); err != nil {
			t.Fatalf("Failed to authenticate: %v", err)
		}

	} else if config.TLSMode == "starttls" {
		client, err := smtp.Dial(addr)
		if err != nil {
			t.Fatalf("Failed to connect to SMTP server: %v", err)
		}
		defer client.Close()

		tlsConfig := &tls.Config{
			InsecureSkipVerify: true,
			ServerName:         config.Host,
		}
		if err = client.StartTLS(tlsConfig); err != nil {
			t.Fatalf("Failed to start TLS: %v", err)
		}

		auth := smtp.PlainAuth("", config.User, config.Password, config.Host)
		if err := client.Auth(auth); err != nil {
			t.Fatalf("Failed to authenticate: %v", err)
		}
	} else {
		t.Fatalf("Invalid SMTP_TLS_MODE: %s", config.TLSMode)
	}
}

