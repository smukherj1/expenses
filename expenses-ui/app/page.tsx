import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { transactionColumns } from "./transactions/columns"
import { transactions } from "./transactions/data"
import { TransactionsTable } from "./transactions/transactions-table"


export default function Home() {
  return <>
    <Tabs defaultValue="edit">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="edit">Edit</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">TODO: Overview of Expenses</TabsContent>
      <TabsContent value="edit">
        <div className="container mx-auto py-10">
          <TransactionsTable columns={transactionColumns} data={transactions} />
        </div>
      </TabsContent>
    </Tabs>
  </>;
}
