import {
  pgTable,
  index,
  bigserial,
  date,
  text,
  bigint,
  vector,
} from "drizzle-orm/pg-core";

export const transactions = pgTable(
  "transactions",
  {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    date: date().notNull(),
    description: text().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    source: text().notNull(),
    tags: text().array(),
    descEmbedding: vector("desc_embedding", { dimensions: 768 }),
  },
  (table) => [
    index("transactions_index").using(
      "btree",
      table.date.asc().nullsLast().op("date_ops"),
      table.description.asc().nullsLast().op("text_ops"),
      table.amountCents.asc().nullsLast().op("text_ops")
    ),
  ]
);
