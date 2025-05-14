package middleware

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"log"
	"net/http"
	"os"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
)

type ClerkUserPublicMetaData struct {
	DbId int32   `json:"db_id"`
	Role db.Role `json:"role"`
}

type UserContext struct {
	DBId  int
	Role  db.Role
	Email string
}

type UserContextKey string

var UserKey UserContextKey = "user"

func ClerkAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userCtx := GetUserCtx(r)
		if userCtx == nil {
			log.Println("[CLERK_MIDDLEWARE] Unauthorized no user ctx")
			http.Error(w, "Error Unauthorized", http.StatusUnauthorized)
			return
		}

		c := context.WithValue(r.Context(), UserKey, userCtx)
		next.ServeHTTP(w, r.WithContext(c))
	})
}

func IsAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := clerk.SessionClaimsFromContext(r.Context())
		if !ok {
			log.Printf("[CLERK_MIDDLEWARE] Failed reading Clerk session")
			http.Error(w, "Error reading request Clerk session", http.StatusUnauthorized)
			return
		}

		user, err := user.Get(r.Context(), claims.Subject)
		if err != nil {
			log.Printf("[CLERK_MIDDLEWARE] Clerk failed getting user: %v", err)
			http.Error(w, "Error getting user from Clerk", http.StatusInternalServerError)
			return
		}

		var userMetaData ClerkUserPublicMetaData
		err = json.Unmarshal(user.PublicMetadata, &userMetaData)
		if err != nil {
			log.Printf("[CLERK_MIDDLEWARE] Failed converting body to JSON: %v", err)
			http.Error(w, "Error converting body to JSON", http.StatusInternalServerError)
			return
		}
		//log.Printf("[CLERK_DEBUG] Parsed role from metadata: %v", userMetaData.Role)
		//log.Printf("[CLERK_DEBUG] Expected admin role: %v", db.RoleAdmin)
		//log.Printf("[CLERK_DEBUG] Role comparison result: %v", userMetaData.Role == db.RoleAdmin)

		if userMetaData.Role != db.RoleAdmin {
			log.Printf("[CLERK_MIDDLEWARE] Unauthorized")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return

		}

		next.ServeHTTP(w, r)
	})
}

func GetUserCtx(r *http.Request) *clerk.User {
	claims, ok := clerk.SessionClaimsFromContext(r.Context())
	if !ok {
		return nil
	}

	user, err := user.Get(r.Context(), claims.Subject)
	if err != nil {
		return nil
	}

	return user
}

func getClerkUser(r *http.Request) (*clerk.User, error) {
	userCtx := r.Context().Value("user")
	clerkUser, ok := userCtx.(*clerk.User)
	if !ok {
		log.Printf("[CLERK_MIDDLEWARE] No user CTX")
		return nil, http.ErrNoCookie
	}
	return clerkUser, nil
}

func IsPowerUser(user *clerk.User) bool {
	var userMetaData ClerkUserPublicMetaData
	err := json.Unmarshal(user.PublicMetadata, &userMetaData)
	if err != nil {
		log.Printf("[CLERK_MIDDLEWARE] Failed converting body to JSON: %v", err)
		return false
	}

	if userMetaData.Role == db.RoleTenant {
		log.Printf("[CLERK_MIDDLEWARE] Unauthorized")
		return false

	}

	return true
}

// CronAuthMiddleware validates requests to cron job endpoints using a secret token
func CronAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get the expected token from environment variables
		expectedToken := os.Getenv("CRON_SECRET_TOKEN")
		if expectedToken == "" {
			log.Printf("[CRON_MIDDLEWARE] Error: CRON_SECRET_TOKEN environment variable not set")
			http.Error(w, "Server configuration error", http.StatusInternalServerError)
			return
		}

		// Get the token from the Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			log.Printf("[CRON_MIDDLEWARE] Error: Missing Authorization header")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Check if the token matches using constant-time comparison
		// This helps prevent timing attacks
		if subtle.ConstantTimeCompare([]byte(authHeader), []byte("Bearer "+expectedToken)) != 1 {
			log.Printf("[CRON_MIDDLEWARE] Error: Invalid token")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Token is valid, proceed with the request
		log.Printf("[CRON_MIDDLEWARE] Cron job authentication successful")
		next.ServeHTTP(w, r)
	})
}
