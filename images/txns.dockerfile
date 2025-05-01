FROM golang:1.24.2-alpine3.21 AS builder

WORKDIR /app

# Download Go modules
COPY go.mod go.sum ./
RUN go mod download

COPY bin ./bin
COPY pkg ./pkg

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -a -installsuffix netgo -ldflags="-s -w" \
    -o txns github.com/smukherj1/expenses/bin/txns

FROM alpine:latest

WORKDIR /app
# Copy the built binary from the builder stage
COPY --from=builder /app/txns .
CMD ["./txns"]