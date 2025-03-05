package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	// Clerk Auth
	"github.com/clerk/clerk-sdk-go/v2"
	// "github.com/clerk/clerk-sdk-go/v2/$resource"
	"github.com/clerk/clerk-sdk-go/v2/user"

	// Chi Router
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	// Load environment variables
)

type Item struct {
	ID    string `json:"id"`
	Value string `json:"value"`
}

var items = make(map[string]Item)

func PutItemHandler(w http.ResponseWriter, r *http.Request) {
	itemID := chi.URLParam(r, "id")

	var updatedItem Item
	if err := json.NewDecoder(r.Body).Decode(&updatedItem); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if itemID != updatedItem.ID {
		http.Error(w, "ID in path and body do not match", http.StatusBadRequest)
		return
	}

	if _, ok := items[itemID]; !ok {
		http.Error(w, "Item not found", http.StatusNotFound)
		return
	}

	items[itemID] = updatedItem

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(updatedItem)
}

func main() {
	
	// Initialize Clerk with your secret key
    clerk.SetKey(os.Getenv("CLERK_SECRET_KEY"))
	
	// Each operation requires a context.Context as the first argument.
	ctx := context.Background()

	// Example usage:
	// resource represents the Clerk SDK Resource Package that you are using such as user, organization, etc.
	// // Get
	// resource, err := user.Get(ctx, id)

	// // Update
	// resource, err := user.Update(ctx, id, &user.UpdateParams{})

	// // Delete
	// resource, err := user.Delete(ctx, id)

	// getUser, err := user.Get(ctx, resource.ID)
	// if err != nil {
	// 	log.Fatalf("failed to get user: %v", err)
	// }

	// CreateClerkUser creates a new user in Clerk with the given parameters
	func CreateClerkUser(ctx context.Context, email string, firstName string, lastName string, username string, password string) (*clerk.User, error) {
		resource, err := clerk.Users().Create(ctx, &clerk.CreateUserParams{
			EmailAddresses: []string{email},
			FirstName:     firstName,
			LastName:      lastName,
			Username: clerk.String(username),
			Password: clerk.String(password),
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create user: %v", err)
		}
		
		return resource, nil
	}

	// Call the function to test it, make sure to pass in the correct parameters
	CreateClerkUser(ctx, "test2@test.com", "John", "Doe", "john-doe2", "crEATEaCRAZYpASSWORDHERE472945!")

	// OS signal channel
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	r := chi.NewRouter()
	r.Use(middleware.Logger)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		// AllowOriginFunc:  func(r *http.Request, origin string) bool { return true },
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300, // Maximum value not ignored by any of major browsers
	}))

	// Protected routes group
	r.Group(func(r chi.Router) {
		
		// Your protected routes go here
		r.Get("/test/get", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("Success in get"))
		})

		// Sample data
		items["1"] = Item{ID: "1", Value: "initial value"}

		r.Post("/test/post", func(w http.ResponseWriter, r *http.Request) {
			// fmt.Printf("%v",items)
			body, err := io.ReadAll(r.Body)
			if err != nil {
				http.Error(w, "Failed to read body", http.StatusInternalServerError)
				return
			}
			defer r.Body.Close()
			fmt.Printf("%s", body)
			fmt.Printf("post success")
			w.WriteHeader(http.StatusOK)
			w.Write(body)
			w.Write([]byte("Success in post"))
		})

		r.Put("/test/put", func(w http.ResponseWriter, r *http.Request) {
			// fmt.Printf("%v",items)
			body, err := io.ReadAll(r.Body)
			if err != nil {
				http.Error(w, "Failed to read body", http.StatusInternalServerError)
				return
			}
			defer r.Body.Close()
			fmt.Printf("%s", body)
			fmt.Printf("put success")
			w.WriteHeader(http.StatusOK)
			w.Write(body)
			w.Write([]byte("Success in put"))
		})

		r.Delete("/test/delete", func(w http.ResponseWriter, r *http.Request) {
			// fmt.Printf("%v",items)
			body, err := io.ReadAll(r.Body)
			if err != nil {
				http.Error(w, "Failed to read body", http.StatusInternalServerError)
				return
			}
			defer r.Body.Close()
			fmt.Printf("%s", body)
			fmt.Printf("delete success")
			w.WriteHeader(http.StatusOK)
			w.Write(body)
		})

		r.Patch("/test/patch", func(w http.ResponseWriter, r *http.Request) {
			// fmt.Printf("%v",items)
			body, err := io.ReadAll(r.Body)
			if err != nil {
				http.Error(w, "Failed to read body", http.StatusInternalServerError)
				return
			}
			defer r.Body.Close()
			fmt.Printf("%s", body)
			fmt.Printf("patch success")
			w.WriteHeader(http.StatusOK)
			w.Write(body)
		})

		// Start of Clerk Routes
		r.Post("/clerk/create-user", func(w http.ResponseWriter, r *http.Request) {
			// Parse the request body
			var requestBody struct {
				Email     string `json:"email"`
				FirstName string `json:"firstName"`
				LastName  string `json:"lastName"`
				Username  string `json:"username"`
				Password  string `json:"password"`
			}

			// Parse the request body
			var requestBody requestBody
			if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
				http.Error(w, "Failed to parse request body", http.StatusBadRequest)
				return
			}

			// Create the user
			CreateClerkUser(ctx, requestBody.Email, requestBody.FirstName, requestBody.LastName, requestBody.Username, requestBody.Password)

			w.WriteHeader(http.StatusOK)
			w.Write([]byte("User created successfully"))
		})
		// End of Clerk Routes	
		
	})

	// Server config
	server := &http.Server{
		Addr:    ":3069",
		Handler: r,
	}

	// Start server
	go func() {
		log.Println("Server is running on port 3069....")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	// Block until we revive an interrupt signal
	<-sigChan
	log.Println("shutting down server...")

	// Gracefully shutdown the server
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("server shutdown failed: %v", err)
	}
}
