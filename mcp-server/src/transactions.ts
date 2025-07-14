import { db } from "./db.js";
import { and, gte, lte, ilike, SQL, sql } from "drizzle-orm";
import { transactions } from "./schema.js";

// Define the interface for a transaction record
type Transaction = {
  date: string;
  description: string;
  amount: string;
  source: string;
  tags: string[] | null;
};

interface TransactionQueryParams {
  fromDate?: string;
  toDate?: string;
  description?: string;
  fromAmount?: number;
  toAmount?: number;
  hasTags?: string[];
  withoutTags?: string[];
  noTags?: boolean;
}

function dateAsYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-indexed
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function GetTransactions(
  params: TransactionQueryParams
): Promise<{ transactions: Transaction[] }> {
  const {
    fromDate,
    toDate,
    description,
    fromAmount,
    toAmount,
    hasTags,
    withoutTags,
    noTags,
  } = params;

  const conditions: SQL[] = [];

  if (fromDate) {
    const d = new Date(fromDate);
    conditions.push(gte(transactions.date, dateAsYYYYMMDD(d)));
  }

  if (toDate) {
    const d = new Date(toDate);
    conditions.push(lte(transactions.date, dateAsYYYYMMDD(d)));
  }

  if (description) {
    conditions.push(ilike(transactions.description, sql`%${description}%`));
  }

  if (fromAmount !== undefined) {
    const amountCents = Math.round(fromAmount * 100);
    conditions.push(gte(sql`ABS(${transactions.amountCents})`, amountCents));
  }

  if (toAmount !== undefined) {
    const amountCents = Math.round(toAmount * 100);
    conditions.push(lte(sql`ABS(${transactions.amountCents})`, amountCents));
  }

  const asSQLArray = (tags: string[]): SQL => {
    const sqlTags = tags.map((t) => sql`${t}`);
    const joinedSqlTags = sql.join(sqlTags, sql`, `);
    return sql`ARRAY[${joinedSqlTags}]::text[]`;
  };

  if (hasTags && hasTags.length > 0) {
    conditions.push(sql`${transactions.tags} && ${asSQLArray(hasTags)}`);
  }

  if (withoutTags && withoutTags.length > 0) {
    conditions.push(
      sql`NOT (${transactions.tags} && ${asSQLArray(withoutTags)})`
    );
  }
  if (noTags === true) {
    conditions.push(
      sql`(${transactions.tags} IS NULL OR cardinality(${transactions.tags}) = 0)`
    );
  }

  try {
    const query = db
      .select({
        date: transactions.date,
        description: transactions.description,
        amount: sql<string>`ABS(ROUND(${transactions.amountCents} / 100, 2))`,
        type: sql<
          "credit" | "debit"
        >`CASE WHEN ${transactions.amountCents} >= 0 THEN 'credit' ELSE 'debit' END`,
        source: transactions.source,
        tags: transactions.tags,
      })
      .from(transactions)
      .where(and(...conditions))
      .orderBy(transactions.date)
      .limit(1000);
    return {
      transactions: await query,
    };
  } catch (error) {
    throw new Error("Failed to retrieve transactions from the database.");
  }
}
