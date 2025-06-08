"use client";

import { useState } from "react";
import { Transaction } from "@/lib/transactions";
import { EditPanel } from "./edit-panel";
import { TransactionsTable } from "@/components/internal/transactions";

export type Props = {
    txns: Transaction[]
}

export function EditClientPage({ txns }: Props) {
    const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
    return (<>
        <EditPanel txnIDs={[...selectedIDs]} />
        <TransactionsTable data={txns} selectedIDs={selectedIDs} setSelectedIDs={setSelectedIDs} />
    </>)
}