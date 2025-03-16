package middleware

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
)

type ClerkUserPublicMetaData struct {
	DbId       int32   `json:"db_id"`
	Role       db.Role `json:"role"`
	UnitNumber int     `json:"unit_number"`
	// Admin(clerk_id) inviting tenant
	ManagementId string `json:"management_id"`
}

type UserContext struct {
	DBId  int
	Role  db.Role
	Email string
}

type UserContextKey string

var UserKey UserContextKey = "user"

func IsAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := clerk.SessionClaimsFromContext(r.Context())
		if !ok {
			log.Printf("[USER_HANDLER] Failed reading Clerk session")
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

		if userMetaData.Role == db.RoleTenant {
			log.Printf("[CLERK_MIDDLEWARE] Unauthorized")
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return

		}

		c := context.WithValue(r.Context(), UserKey, user)
		next.ServeHTTP(w, r.WithContext(c))
	})
}

func GetUserCtx(w http.ResponseWriter, r *http.Request) *clerk.User {
	claims, ok := clerk.SessionClaimsFromContext(r.Context())
	if !ok {
		log.Printf("[CLERK_MIDDLEWARE] Failed reading Clerk session")
		http.Error(w, "Error reading request Clerk session", http.StatusUnauthorized)
		return nil
	}

	user, err := user.Get(r.Context(), claims.Subject)
	if err != nil {
		log.Printf("[CLERK_MIDDLEWARE] Clerk failed getting user: %v", err)
		http.Error(w, "Error getting user from Clerk", http.StatusInternalServerError)
		return nil
	}

	return user
}
