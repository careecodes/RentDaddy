package complaintswork

import (
	"context"
	"log"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/careecodes/RentDaddy/internal/utils"
	"github.com/jackc/pgx/v5/pgxpool"
)

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
