import { db } from "./db.js";
import { and, gte, lte, ilike, SQL, sql } from "drizzle-orm";
import { transactions } from "./schema.js";
import logger from "./logger.js";

// Define the interface for a transaction record
type Transaction = {
  year: number;
  tag: string;
  amount: string;
};

function dateAsYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-indexed
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function asSQLArray(tags: string[]): SQL {
  const sqlTags = tags.map((t) => sql`${t}`);
  const joinedSqlTags = sql.join(sqlTags, sql`, `);
  return sql`ARRAY[${joinedSqlTags}]::text[]`;
}

export async function GetTransactions(): Promise<{
  transactions: Transaction[];
}> {
  const conditions: SQL[] = [
    lte(transactions.amountCents, 0),
    sql`NOT (${transactions.tags} && ${asSQLArray(["transfer"])})`,
  ];

  try {
    const query = db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${transactions.date})`,
        tag: sql<string>`unnest(${transactions.tags})`,
        amount: sql<string>`SUM(ROUND(ABS(${transactions.amountCents}) / 100, 2))`,
      })
      .from(transactions)
      .where(and(...conditions))
      .groupBy(
        sql`EXTRACT(YEAR FROM ${transactions.date})`,
        sql`unnest(${transactions.tags})`
      )
      .orderBy(sql`EXTRACT(YEAR FROM ${transactions.date}) DESC`);
    logger.info(`Running SQL: ${query.toSQL().sql}`);
    logger.info(`SQL variables: ${query.toSQL().params}`);
    return {
      transactions: await query,
    };
  } catch (error) {
    throw new Error(
      `Failed to retrieve transactions from the database: ${error}`
    );
  }
}
