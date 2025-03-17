package utils

import (
	"fmt"
	"github.com/jackc/pgx/v5/pgtype"
	"log"
	"math/rand"
	"os"
	"time"
)

func GetAbsoluteUrl(path string) string {
	url := os.Getenv("DOMAIN_URL")
	port := os.Getenv("PORT")
	if url != "" {
		return fmt.Sprintf("https://%s%s", url, path)
	}
	return fmt.Sprintf("http://localhost:%s%s", port, path)
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
