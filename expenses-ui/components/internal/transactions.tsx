"use client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Transaction } from "@/lib/transactions";

function formatDate(date: Date): string {
    const month = date.getMonth() + 1; // getMonth() returns 0-indexed month
    const day = date.getDate();
    const mm = month < 10 ? '0' + month : month.toString();
    const dd = day < 10 ? '0' + day : day.toString();

    return `${date.getFullYear()}/${mm}/${dd}`;
}

type Props = {
    data: Transaction[]
}

export function TransactionsTable({ data }: Props) {
    return (
        <div className="w-full overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>
                            <Checkbox aria-label="Chukudu" />
                        </TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Tags</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((tx) => (
                        <TableRow key={tx.id}>
                            <TableCell><Checkbox /></TableCell>
                            <TableCell>{formatDate(tx.date)}</TableCell>
                            <TableCell>{tx.description}</TableCell>
                            <TableCell>{tx.amount}</TableCell>
                            <TableCell>{tx.source}</TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {tx.tags.map((tag, i) => (
                                        <span
                                            key={i}
                                            className="bg-muted text-xs px-2 py-1 rounded-md"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}