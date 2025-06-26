import { z } from "zod";

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
