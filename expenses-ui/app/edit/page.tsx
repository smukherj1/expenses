import { FetchTransactions } from "@/lib/transactions";
import { EditClientPage } from "./edit-client-page";

interface EditPageProps {
    searchParams: Promise<{
        fromDate?: string
        toDate?: string
        description?: string
        descriptionOp?: string
        source?: string
        sourceOp?: string
        tags?: string
        tagsOp?: string
    }>;
}

export default async function EditPage({ searchParams }: EditPageProps) {
    const { fromDate, toDate, description, descriptionOp, source, sourceOp, tags, tagsOp } = await searchParams;
    const txns = await FetchTransactions({
        fromDate: fromDate,
        toDate: toDate,
        description: description ?? "",
        descriptionOp: descriptionOp ?? "",
        source: source ?? "",
        sourceOp: sourceOp ?? "",
        tags: tags ?? "",
        tagsOp: tagsOp ?? ""
    });
    return <EditClientPage txns={txns} />;
}