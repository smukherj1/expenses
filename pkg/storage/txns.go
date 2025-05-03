package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

type Txn struct {
	ID            int64
	Date          time.Time
	Description   string
	AmountCents   int64
	Source        string
	DescEmbedding string
}

type Storage struct {
	db *sql.DB
}

func New() (*Storage, error) {
	db, err := sql.Open("postgres", "host=db port=5432 user=postgres password=password dbname=postgres sslmode=disable")
	if err != nil {
		return nil, fmt.Errorf("unable to open connection to postgres: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("connection to postgres was not healthy: %w", err)
	}
	return &Storage{db: db}, nil
}

func (s *Storage) CreateTxn(ctx context.Context, t *Txn) (int64, error) {
	q := `INSERT INTO TRANSACTIONS (DATE, DESCRIPTION, AMOUNT_CENTS, SOURCE, DESC_EMBEDDING)
VALUES ($1, $2, $3, $4, $5) RETURNING ID
`
	var id int64
	if err := s.db.QueryRowContext(ctx, q, t.Date, t.Description, t.AmountCents, t.Source, t.DescEmbedding).Scan(&id); err != nil {
		return 0, fmt.Errorf("error creating transaction: %w", err)
	}
	return id, nil
}

func (s *Storage) GetByID(ctx context.Context, id int64) (*Txn, error) {
	q := `SELECT DATE, DESCRIPTION, AMOUNT_CENTS, SOURCE
FROM TRANSACTIONS WHERE ID = $1
`
	result := &Txn{}
	if err := s.db.QueryRowContext(ctx, q, id).Scan(&result.Date, &result.Description, &result.AmountCents, &result.Source); errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("error fetching transaction with ID %v: %w", id, err)
	}
	return result, nil
}
