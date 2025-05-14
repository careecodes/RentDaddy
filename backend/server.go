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
	"github.com/careecodes/RentDaddy/middleware"

	"github.com/careecodes/RentDaddy/pkg/handlers"
	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
	"github.com/clerk/clerk-sdk-go/v2/session"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
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
	r.Use(chiMiddleware.Logger)
	r.Use(cors.Handler(cors.Options{
		// Specify exact origins instead of wildcard
		AllowedOrigins: []string{"https://app.curiousdev.net", "http://localhost:5173"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		// Add more headers if needed by your frontend
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Requested-With"},
		ExposedHeaders: []string{"Link"},
		// Set this to true if your frontend needs to send credentials
		AllowCredentials: true,
		MaxAge:           300,
	}))
	// // Added to make this work for testing.
	// r.Use(clerkhttp.WithHeaderAuthorization())
	// r.Use(middleware.ClerkAuthMiddleware)
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// Routers
	userHandler := handlers.NewUserHandler(pool, queries)
	r.Post("/setup/admin", userHandler.SetupAdminUser)
	r.Get("/check-admin", userHandler.CheckAdminExists) // Keep for unauthenticated access
	r.Post("/seed-users", userHandler.AdminSeedUsers)
	r.Get("/seed-users/status", userHandler.GetSeedingStatus)
	r.Post("/seed-demo-data", userHandler.AdminSeedData)

	// Locker Handler
	lockerHandler := handlers.NewLockerHandler(pool, queries)
	leaseHandler := handlers.NewLeaseHandler(pool, queries)

	parkingPermitHandler := handlers.NewParkingPermitHandler(pool, queries)
	workOrderHandler := handlers.NewWorkOrderHandler(pool, queries)
	apartmentHandler := handlers.NewApartmentHandler(pool, queries)
	buildingHandler := handlers.NewBuildingHandler(pool, queries)
	chatbotHandler := handlers.NewChatBotHandler(pool, queries)
	complaintHandler := handlers.NewComplaintHandler(pool, queries)

	// Webhooks
	r.Post("/webhooks/clerk", func(w http.ResponseWriter, r *http.Request) {
		handlers.ClerkWebhookHandler(w, r, pool, queries)
	})
	r.Post("/webhooks/documenso", leaseHandler.DocumensoWebhookHandler)

	// Cron job endpoints
	r.Route("/cron", func(r chi.Router) {
		r.Use(middleware.CronAuthMiddleware) // Apply cron auth middleware
		r.Get("/leases/expire", leaseHandler.UpdateAllLeaseStatuses)
		r.Post("/leases/notify-expiring", leaseHandler.NotifyExpiringLeases)
	})

	// Application Routes
	r.Group(func(r chi.Router) {
		// Clerk middleware
		r.Use(clerkhttp.WithHeaderAuthorization(), middleware.ClerkAuthMiddleware)

		// Add authenticated version of check-admin endpoint
		r.Get("/auth/check-admin", userHandler.AuthenticatedCheckAdminExists)

		// Admin Endpoints
		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.IsAdmin) // Clerk Admin middleware
			r.Get("/", userHandler.GetAdminOverview)

			r.Post("/setup", func(w http.ResponseWriter, r *http.Request) {
				err := handlers.ConstructApartments(queries, w, r)
				if err != nil {
					log.Printf("[ERROR] Error constructing Apartments: %v", err)
					return
				}
			})
			// Documenso Configuration
			r.Post("/config/documenso", leaseHandler.UpdateDocumensoConfig)
			// Tenants
			r.Route("/tenants", func(r chi.Router) {
				r.Get("/", userHandler.GetAllTenants)
				r.Post("/invite", userHandler.InviteTenant)
				r.Route("/{clerk_id}", func(r chi.Router) {
					r.Get("/", userHandler.GetUserByClerkId)
					r.Patch("/", userHandler.UpdateTenantProfile)
					r.Delete("/", userHandler.DeleteTenant)
					r.Get("/work_orders", userHandler.GetTenantWorkOrders)
					r.Get("/complaints", userHandler.GetTenantComplaints)
				})
			})

			// ParkingPermits
			r.Route("/parking", func(r chi.Router) {
				r.Get("/", parkingPermitHandler.GetParkingPermits)
				r.Post("/", parkingPermitHandler.CreateParkingPermit)
				r.Get("/in-use/count", parkingPermitHandler.GetParkingPermitAmount)
				r.Route("/{permit_id}", func(r chi.Router) {
					r.Get("/", parkingPermitHandler.GetParkingPermit)
					r.Delete("/", parkingPermitHandler.DeleteParkingPermit)
				})
			})

			// Work Orders
			r.Route("/work_orders", func(r chi.Router) {
				// r.Post("/test", workOrderHandler.CreateManyWorkOrdersHandler)
				r.Get("/", workOrderHandler.ListWorkOrdersHandler)
				r.Post("/", workOrderHandler.CreateWorkOrderHandler)
				r.Route("/{order_id}", func(r chi.Router) {
					r.Get("/", workOrderHandler.GetWorkOrderHandler)
					r.Patch("/", workOrderHandler.UpdateWorkOrderHandler)
					r.Delete("/", workOrderHandler.DeleteWorkOrderHandler)
					r.Route("/status", func(r chi.Router) {
						r.Patch("/", workOrderHandler.UpdateWorkOrderStatusHandler)
					})
				})
			})

			// Start of Locker Handlers
			r.Route("/lockers", func(r chi.Router) {
				r.Get("/", lockerHandler.GetLockers)
				r.Post("/", lockerHandler.AddPackage)
				r.Get("/in-use/count", lockerHandler.GetNumberOfLockersInUse)
				r.Route("/many", func(r chi.Router) {
					r.Post("/", lockerHandler.CreateManyLockers)
					r.Put("/", lockerHandler.BatchUnlockLockers)
					r.Delete("/", lockerHandler.BatchDeleteLockers)
				})
				r.Route("/{id}", func(r chi.Router) {
					r.Get("/", lockerHandler.GetLocker)
					r.Patch("/unlock", lockerHandler.UnlockLocker)
					r.Patch("/code", lockerHandler.UpdateLockerAccessCode)
				})
			})
			// End of Locker Handlers

			// Start of Apartment Handlers
			r.Route("/apartments", func(r chi.Router) {
				r.Get("/", apartmentHandler.ListApartmentsHandler)
				r.Get("/{apartment}", apartmentHandler.GetApartmentHandler)
				r.Post("/", apartmentHandler.CreateApartmentHandler)
				r.Patch("/{apartment}", apartmentHandler.UpdateApartmentHandler)
				r.Delete("/{apartment}", apartmentHandler.DeleteApartmentHandler)
			})
			// End of Apartment Handlers

			// Buildings handlers
			r.Route("/buildings", func(r chi.Router) {
				r.Route("/{id}", func(r chi.Router) {
					r.Put("/", buildingHandler.UpdateBuildingHandler)
				})
			})

			// Complaint
			r.Route("/complaints", func(r chi.Router) {
				r.Get("/", complaintHandler.ListComplaintsHandler)
				r.Post("/", complaintHandler.CreateComplaintHandler)
				r.Patch("/{complaint}", complaintHandler.UpdateComplaintHandler)
				r.Delete("/{complaint}", complaintHandler.DeleteComplaintHandler)
				r.Route("/{complaint_id}", func(r chi.Router) {
					r.Route("/status", func(r chi.Router) {
						r.Patch("/", complaintHandler.UpdateComplaintStatusHandler)
					})
				})
			})

			// Leases
			r.Route("/leases", func(r chi.Router) {
				r.Get("/", leaseHandler.GetLeases)
				r.Post("/create", leaseHandler.CreateLease)
				r.Post("/send/{leaseID}", leaseHandler.SendLease)
				r.Post("/renew", leaseHandler.RenewLease)
				r.Post("/amend", leaseHandler.AmendLease)
				r.Post("/terminate/{leaseID}", leaseHandler.TerminateLease)
				r.Get("/without-lease", leaseHandler.GetTenantsWithoutLease)
				r.Get("/apartments-available", leaseHandler.GetApartmentsWithoutLease)
				r.Get("/update-statuses", leaseHandler.UpdateAllLeaseStatuses)
				r.Post("/notify-expiring", leaseHandler.NotifyExpiringLeases)

				r.Get("/{leaseID}/url", leaseHandler.DocumensoGetDocumentURL)
			})
		})
		// End Admin

		// Tenant Endpoints
		r.Route("/tenant", func(r chi.Router) {
			r.Get("/", userHandler.GetUserByClerkId)
			r.Get("/apartment", userHandler.TenantGetApartment)
			r.Get("/documents", userHandler.TenantGetDocuments)
			r.Get("/work_orders", userHandler.TenantGetWorkOrders)
			r.Post("/work_orders", userHandler.TenantCreateWorkOrder)
			r.Get("/complaints", userHandler.TenantGetComplaints)
			r.Post("/complaints", userHandler.TenantCreateComplaint)

			// Locker Endpoints
			r.Get("/lockers", lockerHandler.GetLockersByUserId)
			r.Post("/lockers/unlock", lockerHandler.TenantUnlockLockers)

			// ParkingPermit Endpoints
			r.Route("/parking", func(r chi.Router) {
				r.Get("/", parkingPermitHandler.TenantGetParkingPermits)
				r.Post("/", parkingPermitHandler.TenantCreateParkingPermit)
				r.Get("/{permit_id}", parkingPermitHandler.GetParkingPermit)
			})
			r.Route("/leases", func(r chi.Router) {
				r.Get("/{user_id}/signing-url", func(w http.ResponseWriter, r *http.Request) {
					leaseHandler.GetTenantLeaseStatusAndURLByUserID(w, r)
				})
			})
		})

		// NOTE: Destory session / ctx on sign out
		r.Post("/signout", func(w http.ResponseWriter, r *http.Request) {
			claims, ok := clerk.SessionClaimsFromContext(r.Context())
			if !ok {
				log.Printf("[SIGN_OUT] Failed destorying session %v", err)
				http.Error(w, "Error destorying session", http.StatusInternalServerError)
				return
			}
			_, err := session.Revoke(r.Context(), &session.RevokeParams{
				ID: claims.ID,
			})
			if err != nil {
				log.Printf("[SIGN_OUT] Failed to revoke session: %v", err)
				http.Error(w, "Error revoking session", http.StatusInternalServerError)
				return
			}

			w.WriteHeader(http.StatusOK)
			w.Write([]byte("Session revoked successfully"))
		})
	})

	// ChatBot routes
	r.Route("/api/chat", func(r chi.Router) {
		r.Post("/", chatbotHandler.ChatHandler)
		r.Get("/", chatbotHandler.ChatGetHandler)
	})

	// Server config
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
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
