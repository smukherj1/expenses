import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { z } from 'zod';

// Zod schema for a single Transaction
export const TransactionSchema = z.object({
    id: z.string().optional().default(""),
    // Custom transform for the date string "yyyy/mm/dd" to a Date object
    date: z.string().transform((str, ctx) => {
        const parts = str.split('/');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
            const day = parseInt(parts[2], 10);
            const date = new Date(year, month, day);
            // Basic validation for a valid date
            if (isNaN(date.getTime())) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Invalid date format. Expected yy/mm/dd',
                });
                return z.NEVER;
            }
            return date;
        }
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid date format. Expected yy/mm/dd',
        });
        return z.NEVER;
    }).optional().default(""),
    description: z.string().optional().default(""),
    amount: z.string().optional().default(""),
    source: z.string().optional().default(""),
    tags: z.array(z.string()).optional().default([]),
});
export type Transaction = z.infer<typeof TransactionSchema>;

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