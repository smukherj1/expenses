package storage

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

type Txn struct {
	ID          int64
	Date        time.Time
	Description string
	AmountCents int64
}

type Storage struct {
	db *sql.DB
}

func New() (*Storage, error) {
	db, err := sql.Open("postgres", fmt.Sprint("host=db port=5432 user=postgres password=password dbname=postgres sslmode=disable"))
	if err != nil {
		return nil, fmt.Errorf("unable to open connection to postgres: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("connection to postgres was not healthy: %w", err)
	}
	return &Storage{db: db}, nil
}

func (s *Storage) CreateTxn(ctx context.Context, t *Txn) (int64, error) {
	q := `INSERT INTO TRANSACTIONS (DATE, DESCRIPTION, AMOUNT_CENTS)
VALUES ($1, $2, $3) RETURNING ID
`
	var id int64
	if err := s.db.QueryRowContext(ctx, q, t.Date, t.Description, t.AmountCents).Scan(&id); err != nil {
		return 0, fmt.Errorf("error creating transaction: %w", err)
	}
	return id, nil
}
