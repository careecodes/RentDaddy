package utils

import (
	"fmt"
	"math/rand"
	"os"
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
