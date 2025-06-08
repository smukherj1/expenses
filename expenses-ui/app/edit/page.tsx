import { FetchTransactions } from "@/lib/transactions";
import { EditClientPage } from "./edit-client-page";

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
    const txns = await FetchTransactions({
        fromDate: fromDate,
        toDate: toDate,
        description: description ?? "",
        source: source ?? "",
        tags: tags ?? ""
    });
    return <EditClientPage txns={txns} />;
}