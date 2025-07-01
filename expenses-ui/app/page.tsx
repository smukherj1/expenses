import {
  FetchTransactionsOverview,
  TxnAmounts,
  TxnOverview,
} from "@/lib/transactions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function creditsPercent(a: number | undefined, o: TxnOverview): string {
  const total =
    (o.tagged_amounts?.credits ?? 0) + (o.untagged_amounts?.credits ?? 0);
  if (total === 0) {
    return "(0.0%)";
  }
  return "(" + (((a ?? 0) * 100) / total).toFixed(1) + "%)";
}

function debitsPercent(a: number | undefined, o: TxnOverview): string {
  const total =
    (o.tagged_amounts?.debits ?? 0) + (o.untagged_amounts?.debits ?? 0);
  if (total === 0) {
    return "(0.0%)";
  }
  return "(" + (((a ?? 0) * 100) / total).toFixed(1) + "%)";
}

export default async function Home() {
  const overview = await FetchTransactionsOverview();
  const currencyFormatter = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  });
  const formatAmount = (amountInCents?: number) => {
    return currencyFormatter.format((amountInCents ?? 0) / 100);
  };
  return (
    <div className="container mx-auto py-10">
      {" "}
      {/* Add some padding and center the table */}
      <h2 className="text-2xl font-bold mb-6">Transactions Overview</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Credits (Tagged)</TableHead>
            <TableHead>Credits (Untagged)</TableHead>
            <TableHead>Debits (Tagged)</TableHead>
            <TableHead>Debits (Untagged)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {overview.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{item.source}</TableCell>
              <TableCell>
                <div className="flex justify-between items-center w-full">
                  <div>{formatAmount(item.tagged_amounts?.credits)}</div>
                  <div>
                    {creditsPercent(item.tagged_amounts?.credits, item)}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex justify-between items-center w-full">
                  <div>{formatAmount(item.untagged_amounts?.credits)}</div>
                  <div>
                    {creditsPercent(item.untagged_amounts?.credits, item)}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex justify-between items-center w-full">
                  <div>{formatAmount(item.tagged_amounts?.debits)}</div>
                  <div>{debitsPercent(item.tagged_amounts?.debits, item)}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex justify-between items-center w-full">
                  <div>{formatAmount(item.untagged_amounts?.debits)}</div>
                  <div>
                    {debitsPercent(item.untagged_amounts?.debits, item)}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
