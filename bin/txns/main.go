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
	ID            string    `json:"id,omitempty"`
	Date          string    `json:"date,omitempty"`
	Description   string    `json:"description,omitempty"`
	Amount        string    `json:"amount,omitempty"`
	Source        string    `json:"source,omitempty"`
	DescEmbedding []float32 `json:"desc_embedding,omitempty"`
}

type txnQuery struct {
	ID          string
	Date        string
	Description string
	Amount      string
	Source      string
}

type postTxnsResp struct {
	ID int64 `json:"id"`
}

func respondf(w http.ResponseWriter, status int, format string, a ...any) {
	w.WriteHeader(status)
	fmt.Fprintf(w, format, a...)
}

func respond(w http.ResponseWriter, status int, body []byte) {
	w.WriteHeader(status)
	w.Write(body)
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
	t, err := time.Parse(dateFmt, tx.Date)
	if err != nil {
		respondf(w, http.StatusBadRequest, "invalid date %q, want format yyyy/mm/dd", tx.Date)
		return
	}
	if len(tx.Description) == 0 || len(tx.Description) > 100 {
		respondf(w, http.StatusBadRequest, "invalid description, got length %v, want 0 < length <= 100", len(tx.Description))
		return
	}
	if len(tx.Source) == 0 || len(tx.Source) > 100 {
		respondf(w, http.StatusBadRequest, "invalid source, got length %v, want 0 < length <= 100", len(tx.Source))
		return
	}
	splitAmount := strings.Split(tx.Amount, ".")
	var dollars, cents string
	if len(splitAmount) == 1 {
		dollars = splitAmount[0]
		cents = "0"
	} else if len(splitAmount) == 2 {
		dollars, cents = splitAmount[0], splitAmount[1]
	} else {
		respondf(w, http.StatusBadRequest, "invalid amount %q, want <dollars>.<cents>", tx.Amount)
		return
	}
	d, err := strconv.ParseInt(dollars, 10, 64)
	if err != nil {
		respondf(w, http.StatusBadRequest, "invalid dollar portion %q in amount %q, expected base 10 64-bit integer: %v", dollars, tx.Amount, err)
		return
	}
	c, err := strconv.ParseInt(cents, 10, 64)
	if err != nil {
		respondf(w, http.StatusBadRequest, "invalid cents portion %q in amount %q, expected base 10 64-bit integer: %v", cents, tx.Amount, err)
		return
	}
	if c > 100 {
		respondf(w, http.StatusBadRequest, "invalid cents portion %q in amount %q, must be < 100", cents, tx.Amount)
		return
	}
	if len(tx.DescEmbedding) != 768 {
		respondf(w, http.StatusBadRequest, "invalid embedding, got vector of length %v, want 768", len(tx.DescEmbedding))
		return
	}
	embeddingJSON, err := json.Marshal(tx.DescEmbedding)
	if err != nil {
		respondf(w, http.StatusInternalServerError, "unable to transform embedding vector into a JSON list: %v", err)
		return
	}
	tid, err := s.db.CreateTxn(r.Context(), &storage.Txn{
		Date:          t,
		Description:   tx.Description,
		AmountCents:   d*100 + c,
		Source:        tx.Source,
		DescEmbedding: string(embeddingJSON),
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
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintln("Ok")))
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
	t, err := s.db.GetByID(r.Context(), txnID)
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
		r.Get("/{id}", ts.getByID)
		r.Post("/", ts.post)
	})
	addr := ":3000"
	log.Println("Running txns server at", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Error while serving: %v", err)
	}
}
