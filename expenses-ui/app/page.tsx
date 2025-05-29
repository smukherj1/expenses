"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TransactionsTable, Transaction } from "./transactions-table"
import { SearchRow } from "./edit/searchrow"
import { useDebouncedCallback } from 'use-debounce';

// Format date as yyyy/mm/dd.
function formatDate(date: Date | undefined): string | undefined {
  if (date == undefined) {
    return undefined;
  }
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}/${month}/${day}`;
}




export default function Home() {
  return <>Welcome to Le Expenses Explora</>
  /*
  const [tagged, setTagged] = useState<"yes" | "no">("no");
  const [fromDate, setFromDate] = useState<Date | undefined>(
    new Date("1970-01-01")
  );
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>(new Array());

  const handleSearch = useDebouncedCallback(async () => {
    console.log("Performing search with:", {
      tagged,
      fromDate: fromDate?.toISOString(), // Convert date to ISO string for consistent logging/API calls
      toDate: toDate?.toISOString(),
      description,
    });
    const fetchedTransactions = await leSearch({
      tagged,
      fromDate: formatDate(fromDate),
      toDate: formatDate(toDate),
      description
    });
    if (fetchedTransactions != undefined) {
      console.log(`Fetched ${fetchedTransactions.length} transactions`);
      setTransactions(fetchedTransactions);
    } else {
      setTransactions(new Array());
    }
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
  */
}
