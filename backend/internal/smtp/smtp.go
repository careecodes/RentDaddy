package config

import (
	"fmt"
	"os"
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

	if host == "" || port == "" || user == "" || password == "" || tlsMode == "" {
		return nil, fmt.Errorf("SMTP configuration is incomplete")
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

