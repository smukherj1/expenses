import { SearchRow, SearchParams } from "./searchrow"
import Transactions from "./transactions";
import { Transaction } from "../transactions-table";

interface TransactionsResp {
    nextId: string,
    txns: Transaction[],
}

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
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: TransactionsResp = await response.json();
        return data.txns;
    } catch (error) {
        console.error("Error fetching data:", error);
        // Handle errors appropriately, e.g., display an error message to the user
    }
    return new Array();
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
    return <><SearchRow /><Transactions data={fetchedTransactions} /></>
}