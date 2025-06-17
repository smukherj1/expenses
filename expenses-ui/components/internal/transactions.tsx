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

type SelectableProps = {
    data: Transaction[];
    selectedIDs: Set<string>;
    setSelectedIDs: (s: Set<string>) => void;
    selectable: true;
};

type NonSelectableProps = {
    data: Transaction[];
    selectedIDs?: never;
    setSelectedIDs?: never;
    selectable?: false;
};

type Props = SelectableProps | NonSelectableProps;

export function TransactionsTable({ data, ...props }: Props) {
    const selectable = props.selectable === true && props.selectedIDs !== undefined && props.setSelectedIDs !== undefined;
    const selectedIDs = selectable ? props.selectedIDs : new Set<string>();
    const setSelectedIDs = selectable ? props.setSelectedIDs : (s: Set<string>) => { };

    const onTxnClick = (id: string) => {
        if (!selectable) return;
        const newSelectedIDs = new Set(selectedIDs);
        const select = !selectedIDs.has(id);
        if (select) {
            newSelectedIDs.add(id);
        } else {
            newSelectedIDs.delete(id);
        }
        setSelectedIDs(newSelectedIDs);
    };

    const onAllTxnsClick = () => {
        if (!selectable) return;
        const selectAll = !(selectedIDs.size === data.length && data.length > 0);
        const newSelectedIDs = new Set(data.filter(() => selectAll).map((txn: Transaction) => txn.id));
        setSelectedIDs(newSelectedIDs);
    };

    return (
        <div className="w-full overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow onClick={selectable ? onAllTxnsClick : undefined}>
                        {selectable && (
                            <TableHead>
                                <Checkbox
                                    checked={selectedIDs.size === data.length && data.length > 0}
                                    aria-label="Select all transactions"
                                />
                            </TableHead>
                        )}
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Tags</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((tx) => (
                        <TableRow key={tx.id} onClick={selectable ? () => onTxnClick(tx.id) : undefined}>
                            {selectable && (
                                <TableCell>
                                    <Checkbox
                                        checked={selectedIDs.has(tx.id)}
                                    />
                                </TableCell>
                            )}
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
    );
}