"use client";

import { useState } from "react";
import { Transaction, TxnQueryParams } from "@/lib/transactions";
import { EditPanel } from "./edit-panel";
import { TransactionsTable } from "@/components/internal/transactions";

export type Props = {
    txns: Transaction[]
    queryParams: TxnQueryParams
}

export function EditClientPage({ txns, queryParams }: Props) {
    const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
    return (<div className="bg-gray-50 dark:bg-gray-900 p-1 space-y-1">
        <EditPanel txnIDs={[...selectedIDs]} queryParams={queryParams} />
        <div className="bg-white dark:bg-gray-800">
            <TransactionsTable data={txns} selectable selectedIDs={selectedIDs} setSelectedIDs={setSelectedIDs} />
        </div>
    </div>)
}