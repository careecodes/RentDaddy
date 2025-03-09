package db

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/careecodes/RentDaddy/internal/db/generated"
)

func ConnectDB(ctx context.Context, dbUrl string) (*generated.Queries, *pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, dbUrl)
	if err != nil {
		log.Fatalf("Cannot connect to DB: %v", err)
		return nil, nil, err
	}

	queries := generated.New(pool)
	return queries, pool, nil
}
