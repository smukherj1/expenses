FROM golang:1.24.4-alpine3.22 AS builder

WORKDIR /app

# Download Go modules
COPY go.mod go.sum ./
RUN go mod download

COPY bin ./bin
COPY pkg ./pkg

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -a -installsuffix netgo -ldflags="-s -w" \
    -o txns github.com/smukherj1/expenses/bin/txns

FROM alpine:3.22.0

WORKDIR /app
# Copy the built binary from the builder stage
COPY --from=builder /app/txns .
CMD ["./txns"]