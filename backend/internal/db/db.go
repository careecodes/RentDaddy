package db

import (
	"context"
	"log"

	db "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/jackc/pgx/v5/pgxpool"
)

func ConnectDB(ctx context.Context, dbUrl string) (*db.Queries, *pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, dbUrl)
	if err != nil {
		log.Fatalf("Cannot connect to DB: %v", err)
		return nil, nil, err
	}

	queries := db.New(pool)
	return queries, pool, nil
}
