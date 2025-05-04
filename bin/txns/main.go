package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/smukherj1/expenses/pkg/storage"
)

const (
	dateFmt = "2006/01/02"
)

type txnsServer struct {
	db *storage.Storage
}

type txn struct {
	ID            string `json:"id,omitempty"`
	Date          string `json:"date,omitempty"`
	Description   string `json:"description,omitempty"`
	Amount        string `json:"amount,omitempty"`
	Source        string `json:"source,omitempty"`
	DescEmbedding string `json:"desc_embedding,omitempty"`
}

type postTxnsResp struct {
	ID int64 `json:"id"`
}

type validatedTxn struct {
	date          time.Time
	description   string
	amountCents   int64
	source        string
	descEmbedding string
}

type validateTxnOpts struct {
	skipDate          bool
	skipDescription   bool
	skipAmount        bool
	skipSource        bool
	skipDescEmbedding bool
}

type validateTxnOption func(vto *validateTxnOpts)

func skipDate() validateTxnOption {
	return func(vto *validateTxnOpts) {
		vto.skipDate = true
	}
}

func skipDescription() validateTxnOption {
	return func(vto *validateTxnOpts) {
		vto.skipDescription = true
	}
}

func skipAmount() validateTxnOption {
	return func(vto *validateTxnOpts) {
		vto.skipAmount = true
	}
}

func skipSource() validateTxnOption {
	return func(vto *validateTxnOpts) {
		vto.skipSource = true
	}
}

func skipDescEmbedding() validateTxnOption {
	return func(vto *validateTxnOpts) {
		vto.skipDescEmbedding = true
	}
}

func respondf(w http.ResponseWriter, status int, format string, a ...any) {
	w.WriteHeader(status)
	fmt.Fprintf(w, format, a...)
}

func respond(w http.ResponseWriter, status int, body []byte) {
	w.WriteHeader(status)
	w.Write(body)
}

func validateDate(dateStr string) (time.Time, int, error) {
	date, err := time.Parse(dateFmt, dateStr)
	if err != nil {
		return time.Time{}, http.StatusBadRequest, fmt.Errorf("invalid date %q, want format yyyy/mm/dd", dateStr)
	}
	return date, http.StatusOK, nil
}

func validateTxn(tx *txn, vopts ...validateTxnOption) (*validatedTxn, int, error) {
	var opts validateTxnOpts
	for _, o := range vopts {
		o(&opts)
	}
	var result validatedTxn
	if !opts.skipDate {
		date, code, err := validateDate(tx.Date)
		if err != nil {
			return nil, code, err
		}
		result.date = date
	}
	if !opts.skipDescription {
		if len(tx.Description) == 0 || len(tx.Description) > storage.DescLimit {
			return nil, http.StatusBadRequest, fmt.Errorf("invalid description, got length %v, want 0 < length <= %v", len(tx.Description), storage.DescLimit)
		}
		result.description = tx.Description
	}
	if !opts.skipSource {
		if len(tx.Source) == 0 || len(tx.Source) > storage.SourceLimit {
			return nil, http.StatusBadRequest, fmt.Errorf("invalid source, got length %v, want 0 < length <= %v", len(tx.Source), storage.SourceLimit)
		}
		result.source = tx.Source
	}
	if !opts.skipAmount {
		splitAmount := strings.Split(tx.Amount, ".")
		var dollars, cents string
		if len(splitAmount) == 1 {
			dollars = splitAmount[0]
			cents = "0"
		} else if len(splitAmount) == 2 {
			dollars, cents = splitAmount[0], splitAmount[1]
		} else {
			return nil, http.StatusBadRequest, fmt.Errorf("invalid amount %q, want <dollars>.<cents>", tx.Amount)
		}
		d, err := strconv.ParseInt(dollars, 10, 64)
		if err != nil {
			return nil, http.StatusBadRequest, fmt.Errorf("invalid dollar portion %q in amount %q, expected base 10 64-bit integer: %v", dollars, tx.Amount, err)
		}
		c, err := strconv.ParseInt(cents, 10, 64)
		if err != nil {
			return nil, http.StatusBadRequest, fmt.Errorf("invalid cents portion %q in amount %q, expected base 10 64-bit integer: %v", cents, tx.Amount, err)
		}
		if c > 100 {
			return nil, http.StatusBadRequest, fmt.Errorf("invalid cents portion %q in amount %q, must be < 100", cents, tx.Amount)
		}
		result.amountCents = d*100 + c
	}
	if !opts.skipDescEmbedding {
		var e []float32
		if err := json.Unmarshal([]byte(tx.DescEmbedding), &e); err != nil {
			return nil, http.StatusBadRequest, fmt.Errorf("description embedding was not a valid JSON list of 32-bit floats: %v", err)
		}
		if len(e) != storage.DescEmbedLen {
			return nil, http.StatusBadRequest, fmt.Errorf("invalid embedding, got vector of length %v, want %b", len(tx.DescEmbedding), storage.DescEmbedLen)
		}
		result.descEmbedding = tx.DescEmbedding
	}
	return &result, http.StatusOK, nil
}

func (s *txnsServer) post(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondf(w, http.StatusBadRequest, "error reading request body: %v", err)
		return
	}
	var tx txn
	if err := json.Unmarshal(body, &tx); err != nil {
		respondf(w, http.StatusBadRequest, "error parsing body as a JSON transaction: %v", err)
		return
	}
	if tx.ID != "" {
		respondf(w, http.StatusBadRequest, "ID can't be specified when creating a new transaction, got ID %q, want blank", tx.ID)
		return
	}
	vtxn, code, err := validateTxn(&tx)
	if err != nil {
		respondf(w, code, "invalid transaction: %v", err)
	}
	tid, err := s.db.CreateTxn(r.Context(), &storage.Txn{
		Date:          vtxn.date,
		Description:   vtxn.description,
		AmountCents:   vtxn.amountCents,
		Source:        vtxn.source,
		DescEmbedding: vtxn.descEmbedding,
	})
	if err != nil {
		respondf(w, http.StatusInternalServerError, "error creating txn: %v", err)
		return
	}
	respBody, err := json.Marshal(&postTxnsResp{ID: tid})
	if err != nil {
		respondf(w, http.StatusBadRequest, "error generating JSON response: %v", err)
		return
	}
	respond(w, http.StatusOK, respBody)
}

func (s *txnsServer) get(w http.ResponseWriter, r *http.Request) {
	fromDateStr := r.URL.Query().Get("fromDate")
	toDateStr := r.URL.Query().Get("toDate")
	desc := r.URL.Query().Get("description")
	amount := r.URL.Query().Get("amount")
	source := r.URL.Query().Get("source")
	startIDStr := r.URL.Query().Get("startId")
	limitStr := r.URL.Query().Get("limit")
	var fromDate, toDate *time.Time
	if fromDateStr != "" {
		d, code, err := validateDate(fromDateStr)
		if err != nil {
			respondf(w, code, "invalid from date: %v", err)
			return
		}
		fromDate = &d
	}
	if toDateStr != "" {
		d, code, err := validateDate(toDateStr)
		if err != nil {
			respondf(w, code, "invalid to date: %v", err)
			return
		}
		toDate = &d
	}
	var startID, limit int64
	if startIDStr != "" {
		var err error
		startID, err = strconv.ParseInt(startIDStr, 10, 64)
		if err != nil || startID < 0 {
			respondf(w, http.StatusBadRequest, "invalid startID, got '%v', want number >= 0", startIDStr)
			return
		}
	}
	if limitStr != "" {
		var err error
		limit, err = strconv.ParseInt(limitStr, 10, 64)
		if err != nil || limit < 0 || limit > 1000 {
			respondf(w, http.StatusBadRequest, "invalid limit, got '%v', want number >= 0 and <= 1000", limitStr)
			return
		}
	}
	opts := []validateTxnOption{skipDescEmbedding(), skipDate()}
	if desc == "" {
		opts = append(opts, skipDescription())
	}
	if amount == "" {
		opts = append(opts, skipAmount())
	}
	if source == "" {
		opts = append(opts, skipSource())
	}
	vtxn, code, err := validateTxn(&txn{
		Description: desc,
		Amount:      amount,
		Source:      source,
	}, opts...)
	if err != nil {
		respondf(w, code, "invalid query parameter(s): %v", err)
		return
	}
	tq := storage.TxnQuery{
		FromDate: fromDate,
		ToDate:   toDate,
		StartID:  startID,
		Limit:    limit,
	}
	if desc != "" {
		tq.Description = &vtxn.description
	}
	if amount != "" {
		tq.AmountCents = &vtxn.amountCents
	}
	if source != "" {
		tq.Source = &vtxn.source
	}
	txns, err := s.db.QueryTxn(r.Context(), &tq)
	if err != nil {
		respondf(w, http.StatusInternalServerError, "error fetching transactions: %v", err)
		return
	}
	respBody, err := json.Marshal(txnsStorageToResp(txns))
	if err != nil {
		respondf(w, http.StatusInternalServerError, "error converting fetched transactions to JSON: %v", err)
		return
	}
	respond(w, http.StatusOK, respBody)
}

type txnsResp struct {
	Txns   []txn  `json:"txns,omitempty"`
	NextID string `json:"nextId,omitempty"`
}

func txnsStorageToResp(sts []storage.Txn) txnsResp {
	var result txnsResp
	var nextID int64
	for _, s := range sts {
		nextID = max(nextID, s.ID+1)
		result.Txns = append(result.Txns, txn{
			ID:          fmt.Sprint(s.ID),
			Date:        s.Date.Format(dateFmt),
			Description: s.Description,
			Amount:      fmt.Sprintf("%v.%v", s.AmountCents/100, s.AmountCents%100),
			Source:      s.Source,
		})
	}
	result.NextID = fmt.Sprint(nextID)
	return result
}

func (s *txnsServer) getByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		respondf(w, http.StatusBadRequest, "txn id missing in URL path")
		return
	}
	txnID, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		respondf(w, http.StatusBadRequest, "id %q in path was not a valid 64-bit integer: %v", id, err)
		return
	}
	t, err := s.db.GetTxn(r.Context(), txnID)
	if err != nil {
		respondf(w, http.StatusInternalServerError, "error fetching txn: %v", err)
		return
	}
	if t == nil {
		respondf(w, http.StatusNotFound, "txn %v not found", txnID)
		return
	}
	txn := txn{
		ID:          fmt.Sprint(t.ID),
		Date:        t.Date.Format(dateFmt),
		Description: t.Description,
		Amount:      fmt.Sprint(t.AmountCents),
	}
	resp, err := json.Marshal(&txn)
	if err != nil {
		respondf(w, http.StatusInternalServerError, "error generating JSON for response: %v", err)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(string(resp)))
}

func (s *txnsServer) patchTxn(w http.ResponseWriter, r *http.Request) {
	respond(w, http.StatusNotImplemented, []byte("not implemented"))
}

func main() {
	db, err := storage.New()
	if err != nil {
		log.Fatalf("Error initializing connection to the database: %v", err)
	}
	ts := txnsServer{db: db}

	r := chi.NewRouter()
	r.Use(middleware.Timeout(60 * time.Second))

	r.Route("/txns", func(r chi.Router) {
		r.Get("/", ts.get)
		r.Post("/", ts.post)
		r.Get("/{id}", ts.getByID)
		r.Patch("/{id}", ts.patchTxn)
	})
	addr := ":3000"
	log.Println("Running txns server at", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Error while serving: %v", err)
	}
}
