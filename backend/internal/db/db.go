package db

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"

	"github.com/careecodes/RentDaddy/internal/db/generated"
)

func ConnectDB(dataSourceName string) (*generated.Queries, *sql.DB, error) {
	db, err := sql.Open("sqlite3", dataSourceName)
	if err != nil {
		log.Fatalf("cannot connect to db with %s: %w", dataSourceName, err)
		return nil, nil, err
	}

	queries := generated.New(db)
	return queries, db, nil
}
