package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/smukherj1/expenses/pkg/storage"
)

type txnsServer struct {
	db *storage.Storage
}

type txn struct {
	Date        string `json:"date"`
	Description string `json:"description"`
	Amount      string `json:"amount"`
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
	t, err := time.Parse("2006/01/02", tx.Date)
	if err != nil {
		respondf(w, http.StatusBadRequest, "invalid date %q, want format yyyy/mm/dd", tx.Date)
		return
	}
	if len(tx.Description) == 0 || len(tx.Description) > 100 {
		respondf(w, http.StatusBadRequest, "invalid description, got length %v, want 0 < length <= 100", len(tx.Description))
		return
	}
	a, err := strconv.ParseInt(tx.Amount, 10, 64)
	if err != nil {
		respondf(w, http.StatusBadRequest, "invalid amount %q, expected base 10 64-bit integer: %v", a, err)
		return
	}
	tid, err := s.db.CreateTxn(r.Context(), &storage.Txn{
		Date:        t,
		Description: tx.Description,
		AmountCents: a,
	})
	if err != nil {
		log.Printf("Error creating transaction: %v", err)
		respondf(w, http.StatusInternalServerError, "internal server error")
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

func main() {
	db, err := storage.New()
	if err != nil {
		log.Fatalf("Error initializing connection to the database: %v", err)
	}
	ts := txnsServer{db: db}

	r := chi.NewRouter()
	r.Use(middleware.Timeout(60 * time.Second))

	r.Route("/txns", func(r chi.Router) {
		r.Get("/{id}", ts.get)
		r.Get("/", ts.get)
		r.Post("/", ts.post)
	})
	addr := ":3000"
	log.Println("Running txns server at", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Error while serving: %v", err)
	}
}
