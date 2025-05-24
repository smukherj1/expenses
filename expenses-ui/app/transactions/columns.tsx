"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Transaction } from "./data"

export const transactionColumns: ColumnDef<Transaction>[] = [
    {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => {
            const date = new Date(row.getValue("date"));
            let year = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(date);
            let month = new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
            let day = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date);
            return <>{`${day}-${month}-${year}`}</>
        },
    },
    {
        accessorKey: "description",
        header: "Description",
    },
    {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => {
            const amount = parseFloat(row.getValue("amount"))
            const formatted = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "usd",
            }).format(amount)

            return <>{formatted}</>
        },
    },
    {
        accessorKey: "source",
        header: "Source",
    },
    //{
    //    accessorKey: "tags",
    //    header: "Tags",
    //},
]
