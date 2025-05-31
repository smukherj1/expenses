import { SearchRow } from "./searchrow"
import { TransactionsTable } from "@/components/internal/transactions";
import { FetchTransactions } from "@/lib/transactions";


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
    const fetchedTransactions = await FetchTransactions({
        tagged: tagged ?? "",
        fromDate: fromDate,
        toDate: toDate,
        description: description ?? ""
    });
    return <><SearchRow /><TransactionsTable data={fetchedTransactions} /></>
}