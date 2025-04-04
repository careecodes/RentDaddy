package main

import (
	"context"
	"log"
	"os"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/internal/utils"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, os.Getenv("PG_URL"))
	if err != nil {
		log.Printf("[DB_Seeder] Error initializing pg: %v", err)
		return
	}
	defer pool.Close()

	queries := db.New(pool)

	users, err := queries.ListUsersByRole(ctx, db.RoleTenant)
	if err != nil {
		log.Println("[DB_Seeder] error counting users: ", err)
		return
	}
	if len(users) > 0 {
		log.Println("[DB_Seeder] tenant users found")
	}

	if run(ctx, pool) != nil {
		log.Printf("[DB_Seeder] Error running scripts: %v", err)
		return
	}
}

func run(ctx context.Context, pool *pgxpool.Pool) error {
	aUser := pool.QueryRow(ctx, "SELECT id FROM users WHERE role = $1", db.RoleAdmin)
	var aID int
	if err := aUser.Scan(&aID); err != nil {
		log.Printf("[DB_Seeder] Error getting adminUser: %v", err)
		return err
	}

	queries := db.New(pool)

	err := utils.SeedDB(queries, pool, int32(aID))
	if err != nil {
		log.Printf("[DB_Seeder] Error seeding db: %v", err)
		return err
	}
	log.Println("[DB_Seeder] Finished seeding db")

	return nil
}
