package storage

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

const (
	DescLimit    = 100
	SourceLimit  = 100
	DescEmbedLen = 768
	TagsLimit    = 30
	TagLenLimit  = 10
)

var (
	descRegexp = regexp.MustCompile(`^[\w\s-]+$`)
	srcRegexp  = regexp.MustCompile(`^[\w\s-]+$`)
)

type Txn struct {
	ID            int64
	Date          time.Time
	Description   string
	AmountCents   int64
	Source        string
	DescEmbedding string
}

func (tx *Txn) validate() error {
	if tx.Date.IsZero() {
		return errors.New("date was not specified")
	}
	if l := len(tx.Description); l == 0 || l > DescLimit {
		return fmt.Errorf("invalid description length, got %v, want >0 and <= %v", l, DescLimit)
	}
	if l := len(tx.Source); l == 0 || l > SourceLimit {
		return fmt.Errorf("invalid source length, got %v, want >0 and <= %v", l, SourceLimit)
	}
	return nil
}

type TxnQuery struct {
	Date        *time.Time
	Description *string
	AmountCents *int64
	Source      *string
}

func (tq *TxnQuery) validate() error {
	if tq.Date == nil && tq.Description == nil && tq.AmountCents == nil && tq.Source == nil {
		return fmt.Errorf("all fields were unspecified")
	}
	if tq.Description != nil {
		if l := len(*tq.Description); l > DescLimit {
			return fmt.Errorf("description too long, got length %v, want <= %v", l, DescLimit)
		}
		if !descRegexp.MatchString(*tq.Description) {
			return fmt.Errorf("description had invalid characters, got '%v', only alphanumeric, spaces, hyphens and dashes are allowed", *tq.Description)
		}
	}
	if tq.Source != nil {
		if l := len(*tq.Source); l > SourceLimit {
			return fmt.Errorf("source too long, got length %v, want <= %v", l, SourceLimit)
		}
		if !srcRegexp.MatchString(*tq.Source) {
			return fmt.Errorf("source had invalid characters, got '%v', only alphanumeric, spaces, hyphens and dashes are allowed", *tq.Source)
		}
	}

	return nil
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
	if err := t.validate(); err != nil {
		return 0, err
	}
	q := `INSERT INTO TRANSACTIONS (DATE, DESCRIPTION, AMOUNT_CENTS, SOURCE, DESC_EMBEDDING)
VALUES ($1, $2, $3, $4, $5) RETURNING ID
`
	var id int64
	if err := s.db.QueryRowContext(ctx, q, t.Date, t.Description, t.AmountCents, t.Source, t.DescEmbedding).Scan(&id); err != nil {
		return 0, fmt.Errorf("error creating transaction: %w", err)
	}
	return id, nil
}

func (s *Storage) GetTxn(ctx context.Context, id int64) (*Txn, error) {
	q := `SELECT DATE, DESCRIPTION, AMOUNT_CENTS, SOURCE
FROM TRANSACTIONS WHERE ID = $1
`
	result := &Txn{ID: id}
	if err := s.db.QueryRowContext(ctx, q, id).Scan(&result.Date, &result.Description, &result.AmountCents, &result.Source); errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("error fetching transaction with ID %v: %w", id, err)
	}
	return result, nil
}

func (s *Storage) QueryTxn(ctx context.Context, tq *TxnQuery) ([]Txn, error) {
	if err := tq.validate(); err != nil {
		return nil, err
	}
	q := `SELECT ID, DATE, DESCRIPTION, AMOUNT_CENTS, SOURCE
FROM TRANSACTIONS WHERE `
	var clauses []string
	if tq.Date != nil {
		ds := tq.Date.Format("2006-01-02")
		dsNext := tq.Date.Add(24 * time.Hour).Format("2006-01-02")
		clauses = append(clauses, fmt.Sprintf("DATE >= '%v' AND DATE < '%v'", ds, dsNext))
	}
	// Raw strings in query are ripe for SQL injection attacks. Leaning on only allowing
	// alphanumeric characters to defend against this for now.
	if tq.Description != nil {
		clauses = append(clauses, fmt.Sprintf("DESCRIPTION = '%v'", *tq.Description))
	}
	if tq.Source != nil {
		clauses = append(clauses, fmt.Sprintf("SOURCE = '%v'", *tq.Source))
	}
	if tq.AmountCents != nil {
		clauses = append(clauses, fmt.Sprintf("AMOUNT_CENTS = %v", *tq.AmountCents))
	}
	q += strings.Join(clauses, "AND")
	q += " LIMIT 1000"

	rows, err := s.db.QueryContext(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("error querying for transactions: %w", err)
	}
	defer rows.Close()

	var result []Txn
	for rows.Next() {
		var txn Txn
		if err := rows.Scan(&txn.ID, &txn.Date, &txn.Description, &txn.AmountCents, &txn.Source); err != nil {
			return nil, fmt.Errorf("error scanning transaction after scanning %v transactions: %w", len(result), err)
		}
		result = append(result, txn)
	}

	return result, nil
}
