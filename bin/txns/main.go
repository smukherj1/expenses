package main

import (
	"fmt"
	"log"
	"net/http"
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
}

func (s *txnsServer) post(w http.ResponseWriter, r *http.Request) {}

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
