"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { transactionColumns } from "./transactions/columns"
import { transactions } from "./transactions/data"
import { TransactionsTable } from "./transactions/transactions-table"
import { SearchRow } from "./searchrow"
import { useDebouncedCallback } from 'use-debounce';


export default function Home() {
  const [tagged, setTagged] = useState<"yes" | "no" | undefined>(undefined);
  const [fromDate, setFromDate] = useState<Date | undefined>(
    new Date("1970-01-01")
  );
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState<string>("");

  const handleSearch = useDebouncedCallback(() => {
    console.log("Performing search with:", {
      tagged,
      fromDate: fromDate?.toISOString(), // Convert date to ISO string for consistent logging/API calls
      toDate: toDate?.toISOString(),
      description,
    });
    // Example: Call an API endpoint here
    // fetch('/api/search', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ tagged, fromDate, toDate, description })
    // });
  }, 300);
  useEffect(() => {
    handleSearch();
  }, [tagged, fromDate, toDate, description]);

  return <>
    <Tabs defaultValue="edit">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="edit">Edit</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">TODO: Overview of Expenses</TabsContent>
      <TabsContent value="edit" className="flex flex-col">
        <SearchRow
          tagged={tagged}
          onTaggedChange={setTagged}
          fromDate={fromDate}
          onFromDateChange={setFromDate}
          toDate={toDate}
          onToDateChange={setToDate}
          description={description}
          onDescriptionChange={setDescription}
        />
        <div className="container mx-auto py-10">
          <TransactionsTable columns={transactionColumns} data={transactions} />
        </div>
      </TabsContent>
    </Tabs>
  </>;
}
