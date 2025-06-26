"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useDebouncedCallback } from "use-debounce";
import { usePathname, useRouter } from "next/navigation";
import EditDialog from "./edit-dialog";
import TextSearchField, { OpType, coerceToOp } from "./text-search-field";
import { TxnQueryParams } from "@/lib/transactions";
import DateSearchField from "./date-search-field";

export type Props = {
  txnIDs: string[];
  queryParams: TxnQueryParams;
  onSubmit: () => void;
};

export function EditPanel({ txnIDs, queryParams, onSubmit }: Props) {
  const [fromDate, setFromDate] = useState<string>(queryParams.fromDate ?? "");
  const [toDate, setToDate] = useState<string>(queryParams.toDate ?? "");
  const [description, setDescription] = useState<string>(
    queryParams.description ?? ""
  );
  const [descriptionOp, setDescriptionOp] = useState<OpType>(
    coerceToOp(queryParams.descriptionOp)
  );
  const [source, setSource] = useState<string>(queryParams.source ?? "");
  const [sourceOp, setSourceOp] = useState<OpType>(
    coerceToOp(queryParams.sourceOp)
  );
  const [tags, setTags] = useState<string>(queryParams.tags ?? "");
  const [tagsOp, setTagsOp] = useState<OpType>(coerceToOp(queryParams.tagsOp));
  const router = useRouter();
  const pathname = usePathname();

  function searchParams(): string {
    const params = new URLSearchParams();
    if (queryParams.ids != undefined) {
      params.set("ids", queryParams.ids);
    }
    if (fromDate != undefined) {
      params.set("fromDate", fromDate);
    }
    if (toDate != undefined) {
      params.set("toDate", toDate);
    }
    if (description.length > 0) {
      params.set("description", description);
      params.set("descriptionOp", descriptionOp);
    }
    if (source.length > 0) {
      params.set("source", source);
      params.set("sourceOp", sourceOp);
    }
    if (tags.length > 0) {
      params.set("tags", tags);
    }
    if (tags.length > 0 || tagsOp == "empty" || tagsOp == "match") {
      params.set("tagsOp", tagsOp);
    }
    return `${params.toString()}`;
  }
  const debouncedSearch = useDebouncedCallback(() => {
    const sp = searchParams();
    router.replace(`${pathname}?${sp}`);
  }, 300);
  useEffect(() => {
    debouncedSearch();
  }, [
    fromDate,
    toDate,
    description,
    descriptionOp,
    source,
    sourceOp,
    tags,
    tagsOp,
  ]);
  const onEditSimilar = () => {
    const params = new URLSearchParams({
      ids: txnIDs.join(" "),
    });
    router.push(`/edit/similar?${params.toString()}`);
  };
  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 w-full p-3 space-y-2">
      <Label className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 block">
        Search and Edit
      </Label>
      <div className="flex flex-col h-20 justify-between items-start sm:flex-row flex-wrap sm:items-end gap-4 p-2 rounded-lg">
        {/* From Date Selector */}
        <DateSearchField field="From" value={fromDate} setValue={setFromDate} />

        {/* To Date Selector */}
        <DateSearchField field="To" value={toDate} setValue={setToDate} />

        {/* Description Input */}
        <TextSearchField
          field="Description"
          value={description}
          setValue={setDescription}
          op={descriptionOp}
          setOp={setDescriptionOp}
        />
        <TextSearchField
          field="Source"
          value={source}
          setValue={setSource}
          op={sourceOp}
          setOp={setSourceOp}
        />
        <TextSearchField
          field="Tags"
          value={tags}
          setValue={setTags}
          op={tagsOp}
          setOp={setTagsOp}
          allowEmpty
        />

        {/* Search and Edit Buttons */}
        <div className="flex flex-col space-y-1 w-full sm:w-auto self-stretch justify-end">
          <Button disabled={txnIDs.length === 0} onClick={onEditSimilar}>
            Search Similar
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button disabled={txnIDs.length === 0}>Edit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Tag Changes</DialogTitle>
                <DialogDescription>
                  Add, remove or clear tags for the selected transactions
                </DialogDescription>
              </DialogHeader>
              <EditDialog txnIDs={txnIDs} tags={tags} onSubmit={onSubmit} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
