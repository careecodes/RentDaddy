package main

import (
	"context"
	"log"
	"os"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("Missing DATABASE_URL environment variable")
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer pool.Close()

	q := db.New(pool)

	if err := q.ExpireLeasesEndingToday(context.Background()); err != nil {
		log.Fatalf("Failed to expire leases: %v", err)
	}

	log.Println("✅ Leases expired successfully")
}
