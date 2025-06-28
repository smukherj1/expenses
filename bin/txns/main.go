package main

import (
	"encoding/json"
	"errors"
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
	ID            string   `json:"id,omitempty"`
	Date          string   `json:"date,omitempty"`
	Description   string   `json:"description,omitempty"`
	Amount        string   `json:"amount,omitempty"`
	Source        string   `json:"source,omitempty"`
	Tags          []string `json:"tags,omitempty"`
	DescEmbedding string   `json:"desc_embedding,omitempty"`
}

type postTxnsResp struct {
	ID int64 `json:"id"`
}

type validatedTxn struct {
	id            int64
	date          time.Time
	description   string
	amountCents   int64
	source        string
	tags          []string
	descEmbedding string
}

type validateTxnOpts struct {
	skipID            bool
	skipDate          bool
	skipDescription   bool
	skipAmount        bool
	skipSource        bool
	skipDescEmbedding bool
}

type validateTxnOption func(vto *validateTxnOpts)

func skipID() validateTxnOption {
	return func(vto *validateTxnOpts) {
		vto.skipID = true
	}
}

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

var commonHeaders = map[string]string{
	// "Access-Control-Allow-Origin":  "*",
	"Access-Control-Allow-Headers": "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization",
	"Content-Type":                 "application/json",
	"Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
}

func respondf(w http.ResponseWriter, status int, format string, a ...any) {
	for k, v := range commonHeaders {
		w.Header().Set(k, v)
	}
	w.WriteHeader(status)
	fmt.Fprintf(w, format, a...)
}

func respond(w http.ResponseWriter, status int, body []byte) {
	for k, v := range commonHeaders {
		w.Header().Set(k, v)
	}
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

func validateDescription(desc string) error {
	if len(desc) == 0 || len(desc) > storage.DescLimit {
		return fmt.Errorf("invalid description, got length %v, want 0 < length <= %v", desc, storage.DescLimit)
	}
	return nil
}

func validateSource(source string) error {
	if len(source) == 0 || len(source) > storage.SourceLimit {
		return fmt.Errorf("invalid source, got length %v, want 0 < length <= %v", len(source), storage.SourceLimit)
	}
	return nil
}

func convertAmount(amount string) (int64, error) {
	splitAmount := strings.Split(amount, ".")
	var dollars, cents string
	if len(splitAmount) == 1 {
		dollars = splitAmount[0]
		cents = "0"
	} else if len(splitAmount) == 2 {
		dollars, cents = splitAmount[0], splitAmount[1]
	} else {
		return 0, fmt.Errorf("invalid amount %q, want <dollars>.<cents>", amount)
	}
	d, err := strconv.ParseInt(dollars, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid dollar portion %q in amount %q, expected base 10 64-bit integer: %v", dollars, amount, err)
	}
	c, err := strconv.ParseInt(cents, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid cents portion %q in amount %q, expected base 10 64-bit integer: %v", cents, amount, err)
	}
	if c > 100 {
		return 0, fmt.Errorf("invalid cents portion %q in amount %q, must be < 100", cents, amount)
	}
	if d < 0 {
		c = -c
	}
	return d*100 + c, nil
}

func validateTxn(tx *txn, vopts ...validateTxnOption) (*validatedTxn, int, error) {
	var opts validateTxnOpts
	for _, o := range vopts {
		o(&opts)
	}
	var result validatedTxn
	if !opts.skipID {
		if len(tx.ID) == 0 {
			return nil, http.StatusBadRequest, errors.New("ID can't be an empty string")
		}
		id, err := strconv.ParseInt(tx.ID, 10, 64)
		if err != nil {
			return nil, http.StatusBadRequest, fmt.Errorf("invalid ID, got '%v', wanted valid 64-bit integer", err)
		}
		result.id = id
	}
	if !opts.skipDate {
		date, code, err := validateDate(tx.Date)
		if err != nil {
			return nil, code, err
		}
		result.date = date
	}
	if !opts.skipDescription {
		if err := validateDescription(tx.Description); err != nil {
			return nil, http.StatusBadRequest, err
		}
		result.description = tx.Description
	}
	if !opts.skipSource {
		if err := validateSource(tx.Source); err != nil {
			return nil, http.StatusBadRequest, err
		}
		result.source = tx.Source
	}
	if !opts.skipAmount {
		a, err := convertAmount(tx.Amount)
		if err != nil {
			return nil, http.StatusBadRequest, fmt.Errorf("invalid amount '%v': %w", tx.Amount, err)
		}
		result.amountCents = a
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
	if err := storage.ValidateTags(tx.Tags); err != nil {
		return nil, http.StatusBadRequest, err
	}
	result.tags = tx.Tags
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
	vopts := []validateTxnOption{skipID()}
	if tx.DescEmbedding == "" {
		vopts = append(vopts, skipDescEmbedding())
	}
	vtxn, code, err := validateTxn(&tx, vopts...)
	if err != nil {
		respondf(w, code, "invalid transaction: %v", err)
	}
	tid, err := s.db.CreateTxn(r.Context(), &storage.Txn{
		Date:          vtxn.date,
		Description:   vtxn.description,
		AmountCents:   vtxn.amountCents,
		Source:        vtxn.source,
		Tags:          vtxn.tags,
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

func txnQueryFromRequest(r *http.Request) (*storage.TxnQuery, error) {
	fromDateStr := r.URL.Query().Get("fromDate")
	toDateStr := r.URL.Query().Get("toDate")
	desc := r.URL.Query().Get("description")
	descOp := r.URL.Query().Get("descriptionOp")
	source := r.URL.Query().Get("source")
	sourceOp := r.URL.Query().Get("sourceOp")
	tagsStr := r.URL.Query().Get("tags")
	tagsOp := r.URL.Query().Get("tagsOp")
	amount := r.URL.Query().Get("amount")
	startIDStr := r.URL.Query().Get("startId")
	limitStr := r.URL.Query().Get("limit")

	var fromDate *time.Time
	if fromDateStr != "" {
		d, _, err := validateDate(fromDateStr)
		if err != nil {
			return nil, fmt.Errorf("invalid value for url parameter fromDate=%v: %w", fromDateStr, err)
		}
		fromDate = &d
	}
	var toDate *time.Time
	if toDateStr != "" {
		d, _, err := validateDate(toDateStr)
		if err != nil {
			return nil, fmt.Errorf("invalid value for url parameter toDate=%v: %w", fromDateStr, err)
		}
		toDate = &d
	}

	var tags *[]string
	if tagsStr != "" {
		t := strings.Split(tagsStr, " ")
		tags = &t
		if ok := storage.ValidateOp(tagsOp); !ok {
			return nil, fmt.Errorf("invalid value for url parameter tagsOp=%v, must be %v", tagsOp, storage.ValidOps)
		}
	}
	var startID int64
	if startIDStr != "" {
		var err error
		startID, err = strconv.ParseInt(startIDStr, 10, 64)
		if err != nil || startID < 0 {
			return nil, fmt.Errorf("invalid value for url parameter startID=%v, want number >= 0", startIDStr)
		}
	}
	var limit int64
	if limitStr != "" {
		var err error
		limit, err = strconv.ParseInt(limitStr, 10, 64)
		if err != nil || limit < 0 || limit > 1000 {
			return nil, fmt.Errorf("invalid value for url parameter limit=%v, want number >= 0 and <= 1000", limitStr)
		}
	}
	var descPtr *string
	if desc != "" {
		if err := validateDescription(desc); err != nil {
			return nil, fmt.Errorf("invalid value for url parameter desc=%v: %w", desc, err)
		}
		if ok := storage.ValidateOp(descOp); !ok {
			return nil, fmt.Errorf("invalid value for url parameter descOp=%v, must be %v", descOp, storage.ValidOps)
		}
		descPtr = &desc
	}
	var sourcePtr *string
	if source != "" {
		if err := validateSource(source); err != nil {
			return nil, fmt.Errorf("invalid value for url parameter source=%v: %w", source, err)
		}
		if ok := storage.ValidateOp(sourceOp); !ok {
			return nil, fmt.Errorf("invalid value for url parameter sourceOp=%v, must be %v", sourceOp, storage.ValidOps)
		}
		sourcePtr = &source
	}
	var amountCents *int64
	if amount != "" {
		a, err := convertAmount(amount)
		if err != nil {
			return nil, fmt.Errorf("invalid value for url parameter amount=%v: %w", amount, err)
		}
		amountCents = &a
	}

	return &storage.TxnQuery{
		FromDate:    fromDate,
		ToDate:      toDate,
		Tags:        tags,
		TagsOp:      tagsOp,
		StartID:     startID,
		Limit:       limit,
		Description: descPtr,
		DescOp:      descOp,
		Source:      sourcePtr,
		SourceOp:    sourceOp,
		AmountCents: amountCents,
	}, nil
}

func (s *txnsServer) get(w http.ResponseWriter, r *http.Request) {
	tq, err := txnQueryFromRequest(r)
	if err != nil {
		respondf(w, http.StatusBadRequest, "error validating request parameters: %v", err)
		return
	}
	txns, err := s.db.QueryTxns(r.Context(), tq)
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
		cents := s.AmountCents % 100
		if cents < 0 {
			cents = -cents
		}
		result.Txns = append(result.Txns, txn{
			ID:          fmt.Sprint(s.ID),
			Date:        s.Date.Format(dateFmt),
			Description: s.Description,
			Amount:      fmt.Sprintf("%v.%v", s.AmountCents/100, cents),
			Source:      s.Source,
			Tags:        s.Tags,
		})
	}
	result.NextID = fmt.Sprint(nextID)
	return result
}

func convertIDs(ids []string) ([]int64, error) {
	var result []int64
	if l := len(ids); l == 0 || l > storage.MaxIDs {
		return nil, fmt.Errorf("invalid number of ids in request, got %v, want > 0 and <= %v", l, storage.MaxIDs)
	}
	for _, istr := range ids {
		id, err := strconv.ParseInt(istr, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("'%v' is not a valid transaction ID, expecting a base 10 64-bit integer: %w", istr, err)
		}
		result = append(result, id)
	}
	return result, nil
}

type getSimilarResp struct {
	Selected []txn `json:"selected_txns,omitempty"`
	Similar  []txn `json:"similar_txns,omitempty"`
}

func (s *txnsServer) getSimilar(w http.ResponseWriter, r *http.Request) {
	idsStr := strings.Trim(r.URL.Query().Get("ids"), " ")
	if idsStr == "" {
		respondf(w, http.StatusBadRequest, "url parameter 'ids' was missing or empty")
		return
	}
	idStrs := strings.Split(idsStr, " ")
	ids, err := convertIDs(idStrs)
	if err != nil {
		respondf(w, http.StatusBadRequest, "error parsing field ids: %v", err)
		return
	}
	tq, err := txnQueryFromRequest(r)
	if err != nil {
		respondf(w, http.StatusBadRequest, "error validating request parameters: %v", err)
		return
	}
	txns, err := s.db.QuerySimilarTxns(r.Context(), ids, tq)
	if err != nil {
		respondf(w, http.StatusInternalServerError, "error finding similar txns: %v", err)
		return
	}
	resp := getSimilarResp{
		Selected: txnsStorageToResp(txns.Selected).Txns,
		Similar:  txnsStorageToResp(txns.Similar).Txns,
	}
	respJSON, err := json.Marshal(&resp)
	if err != nil {
		respondf(w, http.StatusInternalServerError, "error converting response to JSON: %v", err)
	}
	respond(w, http.StatusOK, respJSON)
}

type patchTxn struct {
	IDs           []string `json:"ids,omitempty"`
	Tags          []string `json:"tags,omitempty"`
	DescEmbedding string   `json:"desc_embedding,omitempty"`
}

func (s *txnsServer) patch(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondf(w, http.StatusBadRequest, "error reading request body: %v", err)
		return
	}
	var ptx patchTxn
	if err := json.Unmarshal(body, &ptx); err != nil {
		respondf(w, http.StatusBadRequest, "error parsing body as a JSON transaction: %v", err)
		return
	}
	if len(ptx.IDs) == 0 {
		respondf(w, http.StatusBadRequest, "got 0 txn IDs to update, want >= 1")
		return
	}
	if len(ptx.IDs) > storage.MaxIDs {
		respondf(w, http.StatusBadRequest, "too many IDs in request, got %v, want <= %v", len(ptx.IDs), storage.MaxIDs)
		return
	}
	ids, err := convertIDs(ptx.IDs)
	if err != nil {
		respondf(w, http.StatusBadRequest, "error validating ids in request: %v", err)
		return
	}
	tx := txn{
		Tags:          ptx.Tags,
		DescEmbedding: ptx.DescEmbedding,
	}
	vopts := []validateTxnOption{skipID(), skipDate(), skipDescription(), skipAmount(), skipSource()}
	if len(ptx.DescEmbedding) == 0 {
		vopts = append(vopts, skipDescEmbedding())
	}
	vtx, code, err := validateTxn(&tx, vopts...)
	if err != nil {
		respondf(w, code, fmt.Sprintf("error validating patch request: %v", err))
		return
	}
	tu := &storage.TxnUpdates{}
	if len(vtx.tags) != 0 {
		tu.Tags = &vtx.tags
	}
	if len(vtx.descEmbedding) != 0 {
		tu.DescEmbedding = &vtx.descEmbedding
	}
	if err := s.db.UpdateTxns(r.Context(), ids, tu); err != nil {
		respondf(w, http.StatusInternalServerError, fmt.Sprintf("error patching txn %v: %v", vtx.id, err))
		return
	}
	respondf(w, http.StatusOK, "txn %v updated", vtx.id)
}

type patchTagsRequest struct {
	IDs  []string `json:"ids,omitempty"`
	Tags []string `json:"tags,omitempty"`
	Op   string   `json:"op,omitempty"`
}

func (s *txnsServer) patchTags(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondf(w, http.StatusBadRequest, "error reading request body: %v", err)
		return
	}
	var ptx patchTagsRequest
	if err := json.Unmarshal(body, &ptx); err != nil {
		respondf(w, http.StatusBadRequest, "error parsing body as a JSON transaction: %v", err)
		return
	}
	ids, err := convertIDs(ptx.IDs)
	if err != nil {
		respondf(w, http.StatusBadRequest, "error validating ids in request: %v", err)
		return
	}
	if ptx.Op == "clear" && len(ptx.Tags) != 0 {
		respondf(w, http.StatusBadRequest, "field 'tags' can't be specified when 'op' is clear")
		return
	}
	if ptx.Op != "clear" && len(ptx.Tags) == 0 {
		respondf(w, http.StatusBadRequest, "request body missing field 'tags'")
		return
	}
	if err := storage.ValidateTags(ptx.Tags); err != nil {
		respondf(w, http.StatusBadRequest, "error validating tags in request: %v", err)
		return
	}
	if len(ptx.Op) == 0 {
		respondf(w, http.StatusBadRequest, "request body missing field 'op'")
		return
	}
	switch ptx.Op {
	case "add":
		if err := s.db.TxnAddTags(r.Context(), ids, ptx.Tags); err != nil {
			respondf(w, http.StatusInternalServerError, "error adding tags: %v", err)
			return
		}
	case "remove":
		if err := s.db.TxnRemoveTags(r.Context(), ids, ptx.Tags); err != nil {
			respondf(w, http.StatusInternalServerError, "error removing tags: %v", err)
			return
		}
	case "clear":
		if err := s.db.UpdateTxns(r.Context(), ids, &storage.TxnUpdates{
			Tags: &[]string{},
		}); err != nil {
			respondf(w, http.StatusInternalServerError, "error clearing tags: %v", err)
			return
		}
	default:
		respondf(w, http.StatusBadRequest, "unknown op '%v', supported ops are add|remove|clear", err)
		return
	}

	respondf(w, http.StatusOK, "OK")
}

func (s *txnsServer) overview(w http.ResponseWriter, r *http.Request) {
	o, err := s.db.TxnsOverviews(r.Context())
	if err != nil {
		respondf(w, http.StatusInternalServerError, "error fetching overview: %v", err)
		return
	}
	respJSON, err := json.Marshal(o)
	if err != nil {
		respondf(w, http.StatusInternalServerError, "error converting response to JSON: %v", err)
	}
	respond(w, http.StatusOK, respJSON)
}

func corsHandler(w http.ResponseWriter, _ *http.Request) {
	respondf(w, http.StatusOK, "")
}

func main() {
	db, err := storage.New()
	if err != nil {
		log.Fatalf("Error initializing connection to the database: %v", err)
	}
	ts := txnsServer{db: db}

	r := chi.NewRouter()
	r.Use(middleware.Timeout(60 * time.Second))
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	for k, v := range commonHeaders {
		r.Use(middleware.SetHeader(k, v))
	}

	r.Route("/txns", func(r chi.Router) {
		r.Get("/", ts.get)
		r.Post("/", ts.post)
		r.Patch("/", ts.patch)
		r.Options("/", corsHandler)
		r.Route("/tags", func(r chi.Router) {
			r.Patch("/", ts.patchTags)
		})
		r.Get("/similar", ts.getSimilar)
		r.Get("/overview", ts.overview)
	})
	addr := ":4000"
	log.Println("Running txns server at", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Error while serving: %v", err)
	}
}
