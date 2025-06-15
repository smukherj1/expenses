import { FetchTransactions, TxnQueryParams } from "@/lib/transactions";
import { EditClientPage } from "./edit-client-page";

type EditPageProps = {
    searchParams: Promise<TxnQueryParams>
}

export default async function EditPage({ searchParams }: EditPageProps) {
    const p = await searchParams;
    const txns = await FetchTransactions(p);
    return <EditClientPage txns={txns} queryParams={p} />;
}