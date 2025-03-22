package db

import (
	"context"
	"log"

	generated "github.com/careecodes/RentDaddy/internal/db/generated"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Querier interface {
	CreateLease(ctx context.Context, arg generated.CreateLeaseParams) (int64, error)
	GetLeaseByID(ctx context.Context, id int64) (generated.GetLeaseByIDRow, error)
	GetLeaseTemplateByID(ctx context.Context, id int64) ([]byte, error)
	ListLeases(ctx context.Context) ([]generated.Lease, error) // Use correct type from `models.go`
}

func ConnectDB(ctx context.Context, dbUrl string) (*generated.Queries, *pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, dbUrl)
	if err != nil {
		log.Fatalf("Cannot connect to DB: %v", err)
		return nil, nil, err
	}

	queries := generated.New(pool)
	return queries, pool, nil
}
