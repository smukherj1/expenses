import { SearchRow, SearchParams } from "./searchrow"
import { Transaction, TransactionSchema, TransactionsTable } from "@/components/internal/transactions";
import { z } from 'zod';

// Zod schema for the entire TransactionsResp
const TransactionsRespSchema = z.object({
    nextId: z.string(),
    txns: z.array(TransactionSchema),
});

type TransactionsResp = z.infer<typeof TransactionsRespSchema>;

async function doSearch({ tagged, fromDate, toDate, description }: SearchParams): Promise<Transaction[]> {
    let params = new URLSearchParams({
        limit: "20",
    });
    if (toDate != undefined) {
        params.set("toDate", toDate);
    }
    if (fromDate != undefined) {
        params.set("fromDate", fromDate);
    }
    if (description.length != 0) {
        params.set("description", description);
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


interface EditPageProps {
    searchParams: Promise<{
        tagged?: string;
        fromDate?: string;
        toDate?: string;
        description?: string;
    }>;
}

export default async function EditPage({ searchParams }: EditPageProps) {
    const { tagged, fromDate, toDate, description } = await searchParams;
    console.log(`Edit page with params: tagged=${tagged}, fromDate=${fromDate}, toDate=${toDate}, description=${description}`);
    const fetchedTransactions = await doSearch({
        tagged: tagged ?? "",
        fromDate: fromDate,
        toDate: toDate,
        description: description ?? ""
    });
    return <><SearchRow /><TransactionsTable data={fetchedTransactions} /></>
}