
type QueryParams = {
    txnIds?: string
}

type Props = {
    searchParams: Promise<QueryParams>
}

export default async function EditClientSelectedPage({ searchParams }: Props) {
    const { txnIds } = await searchParams;
    console.log(`txnIds ${txnIds}`);
    const ids = txnIds ? txnIds.split(" ").map((i) => { return i.trim(); }).filter((i) => { return i.length > 0; }) : [];
    return <>Edit {ids.length} selected txns</>
}