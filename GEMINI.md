# Project: Transactions Storage and Analysis App

## General Instructions:

- When generating new TypeScript code, please follow the existing coding style.
- All code should be compatible with TypeScript 5.0 and Node.js 20+.

## Coding Style:

- Use 2 spaces for indentation.
- Private class members should be prefixed with an underscore (`_`).
- Always use strict equality (`===` and `!==`).

## Storage

- `schema/transactions.sql` is the schema for the postgres database.
- Runs as a docker container named `db` defined in `docker-compose.yml`.

## Backend

- Go server implementing a REST API with its entrypoint at `bin/txns/main.go`.
  Provides the APIs at http://localhost:4000. Avoid using or changing this
  server.

- Runs as a docker container named `txns` in defined in `docker-compose.yml`.

## Web App: `expenses-ui`

- NextJS app in typescript using tailwind CSS and shadcn UI components.

- `expenses-ui/app/layout.tsx` and `expenses-ui/app/page.tsx` are the
  entrypoints to the react components and layout of the app.

- `expenses-ui/app/globals.css` contains global CSS.

- `expenses-ui/lib/db.ts` initializes a connection to this database from
  the web app.

- `expenses-ui/lib/transactions.ts` implements functions to fetch data from
  storage.

- `expenses-ui/components/internal/navigation-menu.tsx` implements the main
  navigation panel part of the main layout in `expenses-ui/app/layout.tsx`.
  When asked to add new panel tabs, add them here.

- Always fetch data from storage in a server component which can instantiate a
  client component for reactive elements of the UI, examples:
  - The transaction edit page `expenses-ui/app/edit/page.tsx` which is a server
    component fetches data by calling `FetchTransactions` and passes the fetched
    data to the client component `EditClientPage` defined in
    `expenses-ui/app/edit/edit-client-page.tsx`.
