package utils

import (
	"fmt"
	"log"
	"math/big"
	"math/rand"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

func GetAbsoluteUrl(path string) string {
	url := os.Getenv("DOMAIN_URL")
	port := os.Getenv("PORT")
	env := os.Getenv("ENV")
	
	// For production environments (env set to "production"), use the domain as is
	// This assumes DOMAIN_URL contains full URL including protocol (https://api.curiousdev.net)
	if env == "production" && url != "" {
		// If the URL already has a protocol, use it as is
		if strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://") {
			return fmt.Sprintf("%s%s", url, path)
		}
		// Otherwise add https:// prefix
		return fmt.Sprintf("https://%s%s", url, path)
	}
	
	// For development environments or when url is empty
	if url == "" {
		url = "localhost"
	}
	
	// Check if URL already contains protocol
	if strings.HasPrefix(url, "http://") || strings.HasPrefix(url, "https://") {
		return fmt.Sprintf("%s%s", url, path)
	}
	
	// For local development or when port is specified
	if port != "" {
		return fmt.Sprintf("http://%s:%s%s", url, port, path)
	}
	
	// Fallback with default port
	return fmt.Sprintf("http://%s:8080%s", url, path)
}

func CreatePhoneNumber() string {
	area := rand.Intn(900) + 100
	middle := rand.Intn(900) + 100
	last := rand.Intn(10000)

	return fmt.Sprintf("%d%d%d", area, middle, last)
}

func ConvertToPgTimestamp(input string) (pgtype.Timestamp, error) {
	// Parse the input string into Go's time.Time
	parsedTime, err := time.Parse(time.RFC3339, input)
	if err != nil {
		log.Printf("Error parsing timestamp: %v", err)
		return pgtype.Timestamp{}, err
	}

	// Convert to UTC and remove timezone info
	parsedTime = parsedTime.UTC()

	// Assign it to pgtype.Timestamp
	return pgtype.Timestamp{Time: parsedTime, Valid: true}, nil
}

func ConvertToPgTypeNumeric(value int) pgtype.Numeric {
	var numeric pgtype.Numeric
	numeric.Int = big.NewInt(int64(value))
	numeric.Valid = true
	return numeric
}
