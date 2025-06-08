package storage

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/lib/pq"
)

const (
	MaxIDs       = 1000
	DescLimit    = 100
	SourceLimit  = 100
	DescEmbedLen = 768
	MaxTags      = 30
	TagSizeLimit = 10
	dateQueryFmt = "2006-01-02"
)

var (
	descRegexp = regexp.MustCompile(`^[\w\s-]+$`)
	srcRegexp  = regexp.MustCompile(`^[\w\s-]+$`)
	tagRegexp  = regexp.MustCompile(`^[\w\s-]+$`)
)

type Txn struct {
	ID            int64
	Date          time.Time
	Description   string
	AmountCents   int64
	Source        string
	Tags          []string
	DescEmbedding string
}

func validateTags(tags []string) error {
	if l := len(tags); l > MaxTags {
		return fmt.Errorf("invalid number of tags, got %v, want <= %v", l, MaxTags)
	}
	for i, t := range tags {
		if l := len(t); l == 0 || l > TagSizeLimit {
			return fmt.Errorf("invalid tag at index %v, got size %v, want size > 0 and <= %v", i, l, TagSizeLimit)
		}
		if !tagRegexp.MatchString(t) {
			return fmt.Errorf("illegal characters in tag at index %v, got '%v', only alphanumeric, underscores and dashes are allowed", i, t)
		}
	}
	return nil
}

func validateDescEmbedding(descEmbedding string) error {
	if descEmbedding == "" {
		return nil
	}
	var e []float32
	if err := json.Unmarshal([]byte(descEmbedding), &e); err != nil {
		return fmt.Errorf("description embedding was not a valid JSON list of floats: %v", err)
	}
	if len(e) != DescEmbedLen {
		return fmt.Errorf("description embedding vector had invalid length, got %v, want %v", len(e), DescEmbedLen)
	}
	return nil
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
	if err := validateTags(tx.Tags); err != nil {
		return err
	}
	if err := validateDescEmbedding(tx.DescEmbedding); err != nil {
		return err
	}
	return nil
}

type TxnQuery struct {
	FromDate    *time.Time
	ToDate      *time.Time
	Description *string
	AmountCents *int64
	Source      *string
	Tags        *[]string
	StartID     int64
	Limit       int64
}

func (tq *TxnQuery) validate() error {
	var defaultTxn TxnQuery
	if *tq == defaultTxn {
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
	if tq.Tags != nil {
		if err := validateTags(*tq.Tags); err != nil {
			return fmt.Errorf("error validating tags: %w", err)
		}
	}
	if tq.Limit < 0 || tq.Limit > 1000 {
		return fmt.Errorf("invalid limit, got %v, want >= 0 and <= 1000", tq.Limit)
	} else if tq.Limit == 0 {
		tq.Limit = 1000
	}
	if tq.StartID < 0 {
		return fmt.Errorf("invalid start ID, got %v, want >= 0", tq.StartID)
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
	cols := []string{"DATE", "DESCRIPTION", "AMOUNT_CENTS", "SOURCE", "TAGS"}
	vars := []string{"$1", "$2", "$3", "$4", "$5"}
	vals := []any{t.Date, t.Description, t.AmountCents, t.Source, pq.Array(t.Tags)}
	if t.DescEmbedding != "" {
		cols = append(cols, "DESC_EMBEDDING")
		vars = append(vars, "$6")
		vals = append(vals, t.DescEmbedding)
	}
	q := `INSERT INTO TRANSACTIONS (` + strings.Join(cols, ", ") + `)
VALUES (` + strings.Join(vars, ", ") + `) RETURNING ID
`
	var id int64
	if err := s.db.QueryRowContext(ctx, q, vals...).Scan(&id); err != nil {
		return 0, fmt.Errorf("error creating transaction: %w", err)
	}
	return id, nil
}

func (s *Storage) GetTxn(ctx context.Context, id int64) (*Txn, error) {
	q := `SELECT DATE, DESCRIPTION, AMOUNT_CENTS, SOURCE, TAGS
FROM TRANSACTIONS WHERE ID = $1
`
	result := &Txn{ID: id}
	if err := s.db.QueryRowContext(ctx, q, id).Scan(
		&result.Date,
		&result.Description,
		&result.AmountCents,
		&result.Source,
		(*pq.StringArray)(&result.Tags),
	); errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	} else if err != nil {
		return nil, fmt.Errorf("error fetching transaction with ID %v: %w", id, err)
	}
	return result, nil
}

type TxnUpdates struct {
	Tags          *[]string
	DescEmbedding *string
}

func int64sToStrs(is []int64) []string {
	var s []string
	for _, i := range is {
		s = append(s, fmt.Sprint(i))
	}
	return s
}

func (s *Storage) UpdateTxns(ctx context.Context, ids []int64, tu *TxnUpdates) error {
	var defaultUpdates TxnUpdates
	if tu == nil || *tu == defaultUpdates {
		return fmt.Errorf("no fields were requested to be updated for the given transaction IDs")
	}
	if len(ids) < 1 {
		return fmt.Errorf("ids must be specified")
	}
	q := `UPDATE TRANSACTIONS SET `
	vCounter := 1
	var assigns []string
	var vals []any
	if tu.Tags != nil {
		if err := validateTags(*tu.Tags); err != nil {
			return fmt.Errorf("unable to update txns with invalid tags: %w", err)
		}
		if len(*tu.Tags) == 0 {
			assigns = append(assigns, "TAGS = NULL")
		} else {
			assigns = append(assigns, fmt.Sprint("TAGS = $", vCounter))
			vals = append(vals, pq.Array(*tu.Tags))
			vCounter += 1
		}
	}
	if tu.DescEmbedding != nil {
		if len(ids) != 1 {
			return fmt.Errorf("can't update embedding, got %v ids, want 1", len(ids))
		}
		if err := validateDescEmbedding(*tu.DescEmbedding); err != nil {
			return fmt.Errorf("unable to update txn %v with invalid description embedding: %w", ids[0], err)
		}
		assigns = append(assigns, fmt.Sprint("DESC_EMBEDDING = $", vCounter))
		vals = append(vals, *tu.DescEmbedding)
		vCounter += 1
	}
	q += strings.Join(assigns, ", ")
	q += fmt.Sprintf(" WHERE ID IN (%v)", strings.Join(int64sToStrs(ids), ", "))
	rows, err := s.db.QueryContext(ctx, q, vals...)
	if err != nil {
		return fmt.Errorf("error updating transaction: %w", err)
	}
	defer rows.Close()
	return nil
}

func (s *Storage) TxnAddTags(ctx context.Context, ids []int64, tags []string) error {
	if err := validateTags(tags); err != nil {
		return fmt.Errorf("error validating tags to be added: %w", err)
	}
	if len(ids) == 0 {
		return errors.New("no ids given to add the given tags")
	}
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction with database: %w", err)
	}
	defer func() {
		if tx == nil {
			return
		}
		tx.Rollback()
	}()
	stmt, err := tx.Prepare(`
		UPDATE TRANSACTIONS
		SET TAGS = ARRAY(
			SELECT DISTINCT UNNEST(TAGS || $1::VARCHAR(30)[])
		)
		WHERE ID = ANY($2::BIGINT[])
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	result, err := stmt.ExecContext(ctx, pq.Array(tags), pq.Array(ids))
	if err != nil {
		return fmt.Errorf("failed to execute update: %w", err)
	}
	if rows, err := result.RowsAffected(); err != nil {
		return fmt.Errorf("failed to verify number of updated txns: %w", err)
	} else if int(rows) != len(ids) {
		return fmt.Errorf("not all txns updated successfully, got %v updated, want %v", rows, len(ids))
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error committing updates: %w", err)
	}
	tx = nil
	return nil
}

func (s *Storage) TxnRemoveTags(ctx context.Context, ids []int64, tags []string) error {
	if err := validateTags(tags); err != nil {
		return fmt.Errorf("error validating tags to be removed: %w", err)
	}
	if len(ids) == 0 {
		return errors.New("no ids given to remove the given tags")
	}
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction with database: %w", err)
	}
	defer func() {
		if tx == nil {
			return
		}
		tx.Rollback()
	}()
	stmt, err := tx.Prepare(`
		UPDATE TRANSACTIONS
		SET TAGS = ARRAY(
			SELECT UNNEST(TAGS) EXCEPT SELECT UNNEST($1::VARCHAR(30)[])
		)
		WHERE ID = ANY($2::BIGINT[])
	`)
	if err != nil {
		return fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	result, err := stmt.ExecContext(ctx, pq.Array(tags), pq.Array(ids))
	if err != nil {
		return fmt.Errorf("failed to execute update: %w", err)
	}
	if rows, err := result.RowsAffected(); err != nil {
		return fmt.Errorf("failed to verify number of updated txns: %w", err)
	} else if int(rows) != len(ids) {
		return fmt.Errorf("not all txns updated successfully, got %v updated, want %v", rows, len(ids))
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error committing updates: %w", err)
	}
	tx = nil
	return nil
}

func (s *Storage) QueryTxns(ctx context.Context, tq *TxnQuery) ([]Txn, error) {
	if err := tq.validate(); err != nil {
		return nil, err
	}
	q := `SELECT ID, DATE, DESCRIPTION, AMOUNT_CENTS, SOURCE, TAGS
FROM TRANSACTIONS WHERE `
	var qArgs []any
	qCounter := 1
	clauses := []string{fmt.Sprint("ID >= ", tq.StartID)}
	if tq.FromDate != nil {
		ds := tq.FromDate.Format(dateQueryFmt)
		clauses = append(clauses, fmt.Sprint("DATE >= $", qCounter))
		qCounter += 1
		qArgs = append(qArgs, ds)
	}
	if tq.ToDate != nil {
		ds := tq.ToDate.Format(dateQueryFmt)
		clauses = append(clauses, fmt.Sprint("DATE <= $", qCounter))
		qCounter += 1
		qArgs = append(qArgs, ds)
	}
	if tq.Description != nil {
		clauses = append(clauses, fmt.Sprint("DESCRIPTION ILIKE $", qCounter))
		qCounter += 1
		qArgs = append(qArgs, "%"+*tq.Description+"%")
	}
	if tq.Source != nil {
		clauses = append(clauses, fmt.Sprint("SOURCE ILIKE $", qCounter))
		qCounter += 1
		qArgs = append(qArgs, "%"+*tq.Source+"%")
	}
	if tq.AmountCents != nil {
		clauses = append(clauses, fmt.Sprint("AMOUNT_CENTS = $", qCounter))
		qCounter += 1
		qArgs = append(qArgs, *tq.AmountCents)
	}
	if tq.Tags != nil {
		clauses = append(clauses, fmt.Sprint("TAGS = $", qCounter))
		qCounter += 1
		qArgs = append(qArgs, pq.Array(*tq.Tags))
	}
	q += strings.Join(clauses, " AND ")
	q += fmt.Sprint(" ORDER BY ID ASC LIMIT ", tq.Limit)
	rows, err := s.db.QueryContext(ctx, q, qArgs...)
	if err != nil {
		return nil, fmt.Errorf("error querying for transactions: %w", err)
	}
	defer rows.Close()

	var result []Txn
	for rows.Next() {
		var txn Txn
		if err := rows.Scan(
			&txn.ID,
			&txn.Date,
			&txn.Description,
			&txn.AmountCents,
			&txn.Source,
			(*pq.StringArray)(&txn.Tags),
		); err != nil {
			return nil, fmt.Errorf("error scanning transaction after scanning %v transactions: %w", len(result), err)
		}
		result = append(result, txn)
	}

	return result, nil
}
