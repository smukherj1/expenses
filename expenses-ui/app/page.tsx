"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { transactionColumns } from "./transactions/columns"
import { Transaction } from "./transactions/data"
import { TransactionsTable } from "./transactions/transactions-table"
import { SearchRow } from "./searchrow"
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

interface SearchParams {
  tagged: "yes" | "no"
  fromDate: string | undefined
  toDate: string | undefined
  description: string
};

interface TransactionsResp {
  nextId: string,
  txns: Transaction[],
}

async function leSearch({ tagged, fromDate, toDate, description }: SearchParams): Promise<Transaction[] | undefined> {
  const params = new URLSearchParams({
    toDate: toDate ?? formatDate(new Date()) ?? "",
    fromDate: fromDate ?? "1970/01/01",
    limit: "20",
  }).toString();

  const url = `http://localhost:4000/txns?${params}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: TransactionsResp = await response.json();
    return data.txns;
  } catch (error) {
    console.error("Error fetching data:", error);
    // Handle errors appropriately, e.g., display an error message to the user
  }
  return;
}


export default function Home() {
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
      setTransactions(fetchedTransactions);
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
}
