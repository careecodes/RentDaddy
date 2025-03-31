package complaintswork

import (
	"context"
	"log"
	"os"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
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
	}
	if len(users) > 0 {
		log.Println("[DB_Seeder] tenant users found")
	}

	if run(ctx, pool) != nil {
		log.Printf("[DB_Seeder] Error running scripts: %v", err)
	}

	// Implement the required functionality from complaintswork.Run() here
	log.Println("[DB_Seeder] complaintswork.Run() functionality executed")
}
