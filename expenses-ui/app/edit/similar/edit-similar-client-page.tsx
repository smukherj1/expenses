"use client"

import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { SimilarTransactions, TxnQueryParams } from "@/lib/transactions";
import { TransactionsTable } from "@/components/internal/transactions";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EditPanel } from "../edit-panel";

type Props = {
    txns: SimilarTransactions
    queryParams: TxnQueryParams
}

export default function EditSimilarClientPage({ txns, queryParams }: Props) {
    const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
    return (
        <div className="flex flex-col w-full p-1 space-y-1 bg-gray-50 dark:bg-gray-900 min-h-screen">
            {/* Selected Transactions Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3">
                <Label className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 block">Selected Transactions</Label>
                <ScrollArea className="h-[130px] w-full rounded-md border border-gray-200 dark:border-gray-700 p-2">
                    <TransactionsTable data={txns.selected_txns} />
                </ScrollArea>
            </div>

            <EditPanel txnIDs={[...selectedIDs]} queryParams={queryParams} />

            {/* Similar Transactions Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3">
                <div className="flex flex-row justify-between">
                    <Label className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 block">Similar Transactions</Label>
                    <Button>Edit</Button>
                </div>
                <TransactionsTable
                    data={txns.similar_txns}
                    selectable
                    selectedIDs={selectedIDs}
                    setSelectedIDs={setSelectedIDs}
                />
            </div>
        </div >
    )
}