import { SearchRow } from "./searchrow"
import { TransactionsTable } from "@/components/internal/transactions";
import { FetchTransactions, Transaction } from "@/lib/transactions";

interface EditPageProps {
    searchParams: Promise<{
        fromDate?: string;
        toDate?: string;
        description?: string;
        source?: string;
        tags?: string;
    }>;
}

export default async function EditPage({ searchParams }: EditPageProps) {
    const { fromDate, toDate, description, source, tags } = await searchParams;
    const fetchedTransactions = await FetchTransactions({
        fromDate: fromDate,
        toDate: toDate,
        description: description ?? "",
        source: source ?? "",
        tags: tags ?? ""
    });
    return (<>
        <SearchRow />
        <TransactionsTable data={fetchedTransactions} />
    </>);
}