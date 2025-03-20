package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/careecodes/RentDaddy/internal/db"
	gen "github.com/careecodes/RentDaddy/internal/db/generated"

	// mymiddleware "github.com/careecodes/RentDaddy/middleware"

	"github.com/careecodes/RentDaddy/pkg/handlers"
	"github.com/clerk/clerk-sdk-go/v2"

	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	// OS signal channel
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	dbUrl := os.Getenv("PG_URL")
	if dbUrl == "" {
		log.Fatal("[ENV] Error: No Database url")
	}
	// Get the secret key from the environment variable
	clerkSecretKey := os.Getenv("CLERK_SECRET_KEY")

	if clerkSecretKey == "" {
		log.Fatal("[ENV] CLERK_SECRET_KEY environment vars are required")
	}
	webhookSecret := os.Getenv("CLERK_WEBHOOK")

	if webhookSecret == "" {
		log.Fatal("[ENV] CLERK_WEBHOOK environment vars are required")
	}

	ctx := context.Background()

	queries, pool, err := db.ConnectDB(ctx, dbUrl)
	if err != nil {
		log.Fatalf("[DB] Failed initializing: %v", err)
	}
	defer pool.Close()

	// Initialize Clerk with your secret key
	clerk.SetKey(clerkSecretKey)

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
		handlers.ClerkWebhookHandler(w, r, pool, queries)
	})

	// User Router
	userHandler := handlers.NewUserHandler(pool, queries)
	apartmentHandler := handlers.NewApartmentHandler(pool, queries)

	// Admin Endpoints
	r.Route("/admin", func(r chi.Router) {
		r.Use(clerkhttp.WithHeaderAuthorization()) // Clerk middleware
		// NOTE: Uncomment this after
		// r.Use(mymiddleware.IsAdmin)                // Admin middleware
		r.Get("/", userHandler.GetAdminOverview)
		r.Get("/test", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("Hello this is admin test"))
		})
		r.Route("/tenants", func(r chi.Router) {
			r.Get("/", func(w http.ResponseWriter, r *http.Request) {
				userHandler.GetAllTenants(w, r, gen.RoleTenant)
			})
			r.Get("/{clerk_id}", userHandler.GetUserByClerkId)
			r.Post("/invite", userHandler.InviteTenant)
			r.Patch("/{clerk_id}/credentials", userHandler.UpdateTenantProfile)
		})

		r.Route("/apartments", func(r chi.Router) {
			r.Get("/", apartmentHandler.ListApartmentsHandler)
			r.Get("/{apartment}", apartmentHandler.GetApartmentHandler)
			r.Post("/", apartmentHandler.CreateApartmentHandler)
			r.Patch("/{apartment}", apartmentHandler.UpdateApartmentHandler)
			r.Delete("/{apartment}", apartmentHandler.DeleteApartmentHandler)
		})
	})
	// Tenant Endpoints
	r.Route("/tenant", func(r chi.Router) {
		// r.Use(clerkhttp.WithHeaderAuthorization()) // Clerk middleware
		r.Get("/test", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("Hello this is tenant test"))
		})
		r.Post("/{clerk_id}", userHandler.GetUserByClerkId)
		r.Get("/{clerk_id}/permits", userHandler.GetTenantParkingPermits)
		r.Get("/{clerk_id}/documents", userHandler.GetTenantDocuments)
		r.Get("/{clerk_id}/work_orders", userHandler.GetTenantWorkOrders)
		r.Get("/{clerk_id}/complaints", userHandler.GetTenantComplaints)

		// route to retrieve a tenants apartment
	})

	workOrderHandler := handlers.NewWorkOrderHandler(pool, queries)
	r.Route("/work_orders", func(r chi.Router) {
		// Admin route
		r.Get("/", workOrderHandler.ListWorkOrdersHandler)

		// Create Order
		r.Post("/", func(w http.ResponseWriter, r *http.Request) {
			log.Println("Create Order")
			workOrderHandler.CreateWorkOrderHandler(w, r)
		})

		r.Route("/{order_number}", func(r chi.Router) {
			r.Get("/", func(w http.ResponseWriter, r *http.Request) {
				log.Println("Get Order")
				workOrderHandler.GetWorkOrderHandler(w, r)
			})
			r.Patch("/", func(w http.ResponseWriter, r *http.Request) {
				log.Printf("Update Order")
				workOrderHandler.UpdateWorkOrderHandler(w, r)
			})
			r.Delete("/", func(w http.ResponseWriter, r *http.Request) {
				log.Println("Delete Order")
				workOrderHandler.DeleteWorkOrderHandler(w, r)
			})
		})
	})

	// Server config
	port := os.Getenv("PORT")
	server := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	// Start server
	go func() {
		log.Printf("Server is running on port %s....\n", port)
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
