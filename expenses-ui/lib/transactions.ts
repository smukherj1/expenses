import { z } from "zod";
import sql from "./db";

export type TxnQueryParams = {
  ids?: string;
  fromDate?: string;
  toDate?: string;
  description?: string;
  descriptionOp?: string;
  source?: string;
  sourceOp?: string;
  tags?: string;
  tagsOp?: string;
};

export const TransactionSchema = z.object({
  id: z.string().optional().default(""),
  // Custom transform for the date string "yyyy/mm/dd" to a Date object
  date: z
    .string()
    .transform((str, ctx) => {
      const parts = str.split("/");
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        // Basic validation for a valid date
        if (isNaN(date.getTime())) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invalid date format. Expected yy/mm/dd",
          });
          return z.NEVER;
        }
        return date;
      }
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid date format. Expected yy/mm/dd",
      });
      return z.NEVER;
    })
    .optional()
    .default(""),
  description: z.string().optional().default(""),
  amount: z.string().optional().default(""),
  source: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
});
export type Transaction = z.infer<typeof TransactionSchema>;

const TransactionsRespSchema = z.object({
  nextId: z.string(),
  txns: z.array(TransactionSchema).optional().default(new Array()),
});

function addQueryParamsToUrl(
  {
    fromDate,
    toDate,
    description,
    descriptionOp,
    source,
    sourceOp,
    tags,
    tagsOp,
  }: TxnQueryParams,
  urlParams: URLSearchParams
) {
  if (toDate != undefined) {
    urlParams.set("toDate", toDate);
  }
  if (fromDate != undefined) {
    urlParams.set("fromDate", fromDate);
  }
  if (description != undefined) {
    description = description.trim().toLowerCase();
    if (description.length != 0) {
      urlParams.set("description", description);
      urlParams.set("descriptionOp", descriptionOp ?? "");
    }
  }
  if (source != undefined) {
    source = source.trim().toLowerCase();
    if (source.length != 0) {
      urlParams.set("source", source);
      urlParams.set("sourceOp", sourceOp ?? "");
    }
  }
  if (tags != undefined) {
    tags = tags.trim().toLowerCase();
    if (tags.length != 0) {
      urlParams.set("tags", tags);
      urlParams.set("tagsOp", tagsOp ?? "");
    }
  }
  if (tagsOp === "empty" || tagsOp === "match") {
    urlParams.set("tagsOp", tagsOp);
  }
}

export async function FetchTransactions(
  q: TxnQueryParams
): Promise<Transaction[]> {
  let params = new URLSearchParams({
    limit: "20",
  });
  addQueryParamsToUrl(q, params);

  const url = `http://localhost:4000/txns?${params.toString()}`;
  try {
    console.log(`FetchTransactions url= ${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log(`FetchTransactions response=${response}`);
    if (!response.ok) {
      throw new Error(
        `HTTP error! Response: ${response.status} ${await response.text()}`
      );
    }

    const json = await response.json();
    const result = TransactionsRespSchema.safeParse(json);
    if (!result.success) {
      throw new Error(`Zod validation errors ${result.error.toString()}`);
    }
    return result.data.txns;
  } catch (error) {
    throw new Error(`Error fetching data ${error}`);
  }
}

const SimilarTransactionsRespSchema = z.object({
  selected_txns: z.array(TransactionSchema).optional().default(new Array()),
  similar_txns: z.array(TransactionSchema).optional().default(new Array()),
});
export type SimilarTransactions = z.infer<typeof SimilarTransactionsRespSchema>;

export async function FetchSimilarTransactions(
  q: TxnQueryParams
): Promise<SimilarTransactions> {
  let params = new URLSearchParams({
    ids: q.ids ?? "",
    limit: "40",
  });
  addQueryParamsToUrl(q, params);
  const url = `http://localhost:4000/txns/similar?${params.toString()}`;
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! Response: ${response.status} ${await response.text()}`
      );
    }

    const json = await response.json();
    const result = SimilarTransactionsRespSchema.safeParse(json);
    if (!result.success) {
      throw new Error(`Zod validation errors ${result.error.toString()}`);
    }
    return result.data;
  } catch (error) {
    throw new Error(`Error fetching data ${error}`);
  }
}

const TxnAmountsSchema = z.object({
  credits: z.number(),
  debits: z.number(),
});
const defaultAmounts: z.infer<typeof TxnAmountsSchema> = {
  credits: 0,
  debits: 0,
};

export type TxnAmounts = {
  credits: number;
  debits: number;
};

export type TxnTagMetrics = {
  tag: string;
  value: string;
};

export type TxnOverview = {
  source: string;
  tagged_amounts: TxnAmounts | undefined;
  untagged_amounts: TxnAmounts | undefined;
  top_tags_by_credits: TxnTagMetrics | undefined;
  top_tags_by_debits: TxnTagMetrics | undefined;
};

export type TxnOverviews = {
  global: TxnOverview;
  bySource: Map<string, TxnOverview>;
};

const TxnSourceOverviewsSchema = z.array(
  z.object({
    source: z.string(),
    count: z.string(),
    tagged_credits: z.string(),
    tagged_debits: z.string(),
    untagged_credits: z.string(),
    untagged_debits: z.string(),
  })
);

export async function FetchTransactionsOverview(): Promise<TxnOverview[]> {
  try {
    const json = await sql`
WITH AllTxns AS (
  SELECT
  CASE WHEN AMOUNT_CENTS >= 0 THEN AMOUNT_CENTS ELSE 0 END AS CREDITS,
  CASE WHEN AMOUNT_CENTS < 0 THEN -AMOUNT_CENTS ELSE 0 END AS DEBITS,
  CASE WHEN CARDINALITY(TAGS) > 0 THEN TRUE ELSE FALSE END AS TAGGED,
  SOURCE
  FROM Transactions
),
CategorizedTxns AS (
  SELECT
  CASE WHEN TAGGED THEN CREDITS ELSE 0 END AS TAGGED_CREDITS,
  CASE WHEN TAGGED THEN DEBITS ELSE 0 END AS TAGGED_DEBITS,
  CASE WHEN TAGGED THEN 0 ELSE CREDITS END AS UNTAGGED_CREDITS,
  CASE WHEN TAGGED THEN 0 ELSE DEBITS END AS UNTAGGED_DEBITS,
  SOURCE
  FROM AllTxns
)

SELECT
  SOURCE,
  COUNT(*) AS COUNT,
  SUM(TAGGED_CREDITS) AS TAGGED_CREDITS,
  SUM(TAGGED_DEBITS) AS TAGGED_DEBITS,
  SUM(UNTAGGED_CREDITS) AS UNTAGGED_CREDITS,
  SUM(UNTAGGED_DEBITS) AS UNTAGGED_DEBITS
FROM CategorizedTxns
GROUP BY SOURCE
ORDER BY (
  SUM(TAGGED_CREDITS)
  + SUM(TAGGED_DEBITS)
  + SUM(UNTAGGED_CREDITS)
  + SUM(UNTAGGED_DEBITS)
) DESC
;
    `;
    const result = TxnSourceOverviewsSchema.safeParse(json);
    if (!result.success) {
      console.log(
        `Error parsing response from server in FetchTransactionsOverview: ${result.error.toString()}`
      );
      throw result.error;
    }
    const txnOverviews = new Array<TxnOverview>();
    const globalOverview: TxnOverview = {
      source: "all",
      tagged_amounts: {
        credits: 0,
        debits: 0,
      },
      untagged_amounts: {
        credits: 0,
        debits: 0,
      },
      top_tags_by_credits: undefined,
      top_tags_by_debits: undefined,
    };
    for (const so of result.data) {
      const to: TxnOverview = {
        source: so.source,
        tagged_amounts: {
          credits: parseInt(so.tagged_credits, 10),
          debits: parseInt(so.tagged_debits, 10),
        },
        untagged_amounts: {
          credits: parseInt(so.untagged_credits, 10),
          debits: parseInt(so.untagged_debits, 10),
        },
        top_tags_by_credits: undefined,
        top_tags_by_debits: undefined,
      };
      if (
        globalOverview.tagged_amounts != undefined &&
        to.tagged_amounts != undefined
      ) {
        globalOverview.tagged_amounts.credits += to.tagged_amounts.credits;
        globalOverview.tagged_amounts.debits += to.tagged_amounts.debits;
      }

      if (
        globalOverview.untagged_amounts != undefined &&
        to.untagged_amounts != undefined
      ) {
        globalOverview.untagged_amounts.credits += to.untagged_amounts.credits;
        globalOverview.untagged_amounts.debits += to.untagged_amounts.debits;
      }
      txnOverviews.push(to);
    }
    return [globalOverview, ...txnOverviews];
  } catch (error) {
    console.log(`Error: FetchTransactionsOverview: ${error}`);
    throw error;
  }
}
