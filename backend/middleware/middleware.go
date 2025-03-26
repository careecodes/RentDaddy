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

func GetClerkUser(r *http.Request) (*clerk.User, error) {
	userCtx := r.Context().Value("user")
	clerkUser, ok := userCtx.(*clerk.User)
	if !ok {
		log.Printf("[CLERK_MIDDLEWARE] No user CTX")
		return nil, http.ErrNoCookie // Use a relevant error
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
