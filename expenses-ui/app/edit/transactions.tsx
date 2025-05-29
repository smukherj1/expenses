import { Transaction, TransactionsTable } from "../transactions-table";

interface TransactionProps {
    data: Transaction[]
}


export default function Transactions({ data }: TransactionProps) {
    return <><TransactionsTable data={data} /></>;
}