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

	"github.com/careecodes/RentDaddy/pkg/handlers"
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
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

// QuickDump is a function that dumps the request to the console for debugging purposes
//
//	func QuickDump(r *http.Request) {
//		dump, err := httputil.DumpRequest(r, true)
//		if err != nil {
//			http.Error(w, "Failed to dump request", http.StatusInternalServerError)
//			return
//		}
//		fmt.Printf("Request dump: %s\n", dump)
//	}

func main() {
	// OS signal channel
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Fatal("Warning: No .env file found")
	}
	dbUrl := os.Getenv("PG_URL")
	if dbUrl == "" {
		log.Fatal("Error: No DB url")
	}

	ctx := context.Background()

	dbpool, err := pgxpool.New(ctx, dbUrl)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer dbpool.Close()

	// Get the secret key from the environment variable
	clerkSecretKey := os.Getenv("CLERK_SECRET_KEY")
	if clerkSecretKey == "" {
		log.Fatal("CLERK_SECRET_KEY environment variable is required")
	}

	// Initialize Clerk with your secret key
	clerk.SetKey(clerkSecretKey)

	// Example Clerk usage:
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

	// Webhooks
	r.Post("/webhooks/clerk", func(w http.ResponseWriter, r *http.Request) {
		handlers.ClerkWebhookHanlder(w, r, dbpool)
	})

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

	r.Put("/test/clerk/update-username", func(w http.ResponseWriter, r *http.Request) {
		// QuickDump(r) // Uncomment to see the request dump

		// Define a struct to parse the incoming JSON
		type UpdateUsernameRequest struct {
			ID       string `json:"id"`
			Username string `json:"username"`
		}

		// Set the request body to the struct so that we can parse the request body
		var updateReq UpdateUsernameRequest

		// Parse the request body
		if err := json.NewDecoder(r.Body).Decode(&updateReq); err != nil {
			log.Printf("Error decoding request body: %v", err)
			http.Error(w, "Failed to parse request body: "+err.Error(), http.StatusBadRequest)
			return
		}

		// Log the parsed request
		log.Printf("Received update request - ID: %s, Username: %s", updateReq.ID, updateReq.Username)

		// Check if ID is provided
		if updateReq.ID == "" {
			http.Error(w, "User ID is required", http.StatusBadRequest)
			return
		}

		log.Printf("Updating user with ID: %s", updateReq.ID)

		// Update the user with the provided ID and username
		resource, err := user.Update(r.Context(), updateReq.ID, &user.UpdateParams{
			Username: clerk.String(updateReq.Username),
		})
		if err != nil {
			log.Printf("Error updating user: %v", err)
			http.Error(w, "Failed to update user: "+err.Error(), http.StatusInternalServerError)
			return
		}

		log.Printf("User updated successfully: %v", resource.ID)

		// Return the updated user as JSON using the response writer and the resource
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(resource)
	})
	// End of Clerk Routes

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

	// Block until we reveive an interrupt signal
	<-sigChan
	log.Println("shutting down server...")

	// Gracefully shutdown the server
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("server shutdown failed: %v", err)
	}
}
