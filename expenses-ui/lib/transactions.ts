import { z } from 'zod';

export const TransactionSchema = z.object({
    id: z.string().optional().default(""),
    // Custom transform for the date string "yyyy/mm/dd" to a Date object
    date: z.string().transform((str, ctx) => {
        const parts = str.split('/');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
            const day = parseInt(parts[2], 10);
            const date = new Date(year, month, day);
            // Basic validation for a valid date
            if (isNaN(date.getTime())) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Invalid date format. Expected yy/mm/dd',
                });
                return z.NEVER;
            }
            return date;
        }
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid date format. Expected yy/mm/dd',
        });
        return z.NEVER;
    }).optional().default(""),
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

export async function FetchTransactions({ fromDate, toDate, description, descriptionOp, source, sourceOp, tags, tagsOp }: {
    fromDate: string | undefined
    toDate: string | undefined
    description: string
    descriptionOp: string
    source: string
    sourceOp: string
    tags: string
    tagsOp: string
}): Promise<Transaction[]> {
    let params = new URLSearchParams({
        limit: "20",
    });
    if (toDate != undefined) {
        params.set("toDate", toDate);
    }
    if (fromDate != undefined) {
        params.set("fromDate", fromDate);
    }
    description = description.trim().toLowerCase();
    if (description.length != 0) {
        params.set("description", description);
        params.set("descriptionOp", descriptionOp)
    }
    source = source.trim().toLowerCase();
    if (source.length != 0) {
        params.set("source", source);
        params.set("sourceOp", sourceOp);
    }
    tags = tags.trim().toLowerCase();
    if (tags.length != 0) {
        params.set("tags", tags);
        params.set("tagsOp", tagsOp)
    } else if (tagsOp === "empty") {
        params.set("tagsOp", tagsOp)
    }

    const url = `http://localhost:4000/txns?${params.toString()}`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Response: ${response.status} ${await response.text()}`);
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