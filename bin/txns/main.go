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

func validateTags(tags []string) error {
	if len(tags) > storage.MaxTags {
		return fmt.Errorf("tags limit exceeded, got %v tags, want <= %v", len(tags), storage.MaxTags)
	}
	for i, t := range tags {
		if len(t) == 0 || len(t) > storage.TagSizeLimit {
			return fmt.Errorf("length of tag at index %v was invalid, got length %v, want <= %v", i, len(t), storage.TagSizeLimit)
		}
	}
	return nil
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
		if d < 0 {
			c = -c
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
	if err := validateTags(tx.Tags); err != nil {
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

func (s *txnsServer) get(w http.ResponseWriter, r *http.Request) {
	fromDateStr := r.URL.Query().Get("fromDate")
	toDateStr := r.URL.Query().Get("toDate")
	desc := r.URL.Query().Get("description")
	descOp := r.URL.Query().Get("descriptionOp")
	amount := r.URL.Query().Get("amount")
	source := r.URL.Query().Get("source")
	sourceOp := r.URL.Query().Get("sourceOp")
	tagsStr := r.URL.Query().Get("tags")
	tagsOp := r.URL.Query().Get("tagsOp")
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

	var tags []string
	if tagsStr != "" {
		tags = strings.Split(tagsStr, " ")
		if ok := storage.ValidateOp(tagsOp); !ok {
			respondf(w, http.StatusBadRequest, "invalid tags op '%v', must be %v", tagsOp, storage.ValidOps)
			return
		}
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
	opts := []validateTxnOption{skipID(), skipDescEmbedding(), skipDate()}
	if desc == "" {
		opts = append(opts, skipDescription())
	} else if ok := storage.ValidateOp(descOp); !ok {
		respondf(w, http.StatusBadRequest, "invalid description op '%v', must be %v", descOp, storage.ValidOps)
		return
	} else if descOp == storage.OpEmpty {
		respondf(w, http.StatusBadRequest, "unsupported description op '%v'", descOp)
		return
	}
	if amount == "" {
		opts = append(opts, skipAmount())
	}
	if source == "" {
		opts = append(opts, skipSource())
	} else if ok := storage.ValidateOp(sourceOp); !ok {
		respondf(w, http.StatusBadRequest, "invalid source op '%v', must be %v", sourceOp, storage.ValidOps)
		return
	} else if sourceOp == storage.OpEmpty {
		respondf(w, http.StatusBadRequest, "unsupported source op '%v'", sourceOp)
		return
	}
	vtxn, code, err := validateTxn(&txn{
		Description: desc,
		Amount:      amount,
		Source:      source,
		Tags:        tags,
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
		tq.DescOp = descOp
	}
	if amount != "" {
		tq.AmountCents = &vtxn.amountCents
	}
	if source != "" {
		tq.Source = &vtxn.source
		tq.SourceOp = sourceOp
	}
	if tags != nil {
		tq.Tags = &tags
	}
	if tags != nil || tagsOp == storage.OpEmpty {
		tq.TagsOp = tagsOp
	}
	txns, err := s.db.QueryTxns(r.Context(), &tq)
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
	txns, err := s.db.QuerySimilarTxns(r.Context(), ids)
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
	if err := validateTags(ptx.Tags); err != nil {
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
	})
	addr := ":4000"
	log.Println("Running txns server at", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Error while serving: %v", err)
	}
}
