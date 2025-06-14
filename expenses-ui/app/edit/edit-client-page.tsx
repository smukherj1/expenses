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
    return (<>
        <EditPanel txnIDs={[...selectedIDs]} queryParams={queryParams} />
        <TransactionsTable data={txns} selectedIDs={selectedIDs} setSelectedIDs={setSelectedIDs} />
    </>)
}