package utils

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"

	gen "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/clerk/clerk-sdk-go/v2"
)

type ClerkUserPublicMetaData struct {
	DbId       int32    `json:"db_id"`
	Role       gen.Role `json:"role"`
	UnitNumber int      `json:"unit_number"`
	// Admin(clerk_id) inviting tenant
	ManagementId string `json:"management_id"`
}

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

func IsPowerUser(user *clerk.User) bool {
	var userMetaData ClerkUserPublicMetaData
	err := json.Unmarshal(user.PublicMetadata, &userMetaData)
	if err != nil {
		log.Printf("[CLERK_MIDDLEWARE] Failed converting body to JSON: %v", err)
		return false
	}

	if userMetaData.Role == gen.RoleTenant {
		log.Printf("[CLERK_MIDDLEWARE] Unauthorized")
		return false

	}

	return true
}
