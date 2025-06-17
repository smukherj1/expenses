import { FetchSimilarTransactions, TxnQueryParams } from "@/lib/transactions";
import EditSimilarClientPage from "./edit-similar-client-page";

type Props = {
    searchParams: Promise<TxnQueryParams>
}

export default async function Page({ searchParams }: Props) {
    const p = await searchParams;
    const similarTxns = await FetchSimilarTransactions(p);
    return <EditSimilarClientPage txns={similarTxns} queryParams={p} />
}