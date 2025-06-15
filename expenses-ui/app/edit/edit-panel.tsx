"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label";
import { useDebouncedCallback } from 'use-debounce';
import { usePathname, useRouter } from 'next/navigation';
import { formatDate } from "../utils";
import EditDialog from "./edit-dialog";
import TextSearchField, { OpType, coerceToOp } from "./text-search-field";
import { TxnQueryParams } from "@/lib/transactions";

export type Props = {
    txnIDs: string[]
    queryParams: TxnQueryParams
}

export function EditPanel({ txnIDs, queryParams }: Props) {
    const [fromDate, setFromDate] = useState<Date | undefined>(
        new Date(queryParams.fromDate ?? "2014-01-01")
    );
    const [toDate, setToDate] = useState<Date | undefined>(() => {
        if (queryParams.toDate == undefined) {
            return new Date();
        }
        return new Date(queryParams.toDate);
    });
    const [description, setDescription] = useState<string>(queryParams.description ?? "");
    const [descriptionOp, setDescriptionOp] = useState<OpType>(coerceToOp(queryParams.descriptionOp));
    const [source, setSource] = useState<string>(queryParams.source ?? "");
    const [sourceOp, setSourceOp] = useState<OpType>(coerceToOp(queryParams.sourceOp));
    const [tags, setTags] = useState<string>(queryParams.tags ?? "");
    const [tagsOp, setTagsOp] = useState<OpType>(coerceToOp(queryParams.tagsOp));
    const router = useRouter();
    const pathname = usePathname();

    function searchParams(): string {
        const params = new URLSearchParams();
        if (fromDate != undefined) {
            params.set('fromDate', formatDate(fromDate));
        }
        if (toDate != undefined) {
            params.set('toDate', formatDate(toDate));
        }
        if (description.length > 0) {
            params.set('description', description);
            params.set('descriptionOp', descriptionOp);
        }
        if (source.length > 0) {
            params.set('source', source);
            params.set('sourceOp', sourceOp);
        }
        if (tags.length > 0) {
            params.set('tags', tags);
        }
        if (tags.length > 0 || tagsOp == "empty") {
            params.set('tagsOp', tagsOp);
        }
        return `${params.toString()}`;
    }
    const debouncedSearch = useDebouncedCallback(() => {
        const sp = searchParams();
        router.replace(`${pathname}?${sp}`);
    }, 300);
    useEffect(() => {
        debouncedSearch();
    },
        [fromDate, toDate, description, descriptionOp,
            source, sourceOp, tags, tagsOp]
    );
    const onEditSelected = () => {
        const params = new URLSearchParams({
            txnIds: txnIDs.join(" ")
        });
        router.push(`${pathname}/selected?${params.toString()}`);
    };
    return (
        <Card className="gap-1 py-3 bg-gray-50 shadow-sm">
            <CardHeader>
                <CardTitle>Search for transactions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col h-20 justify-between items-start sm:flex-row flex-wrap sm:items-end gap-4 p-2 rounded-lg">
                {/* From Date Selector */}
                <div className="flex flex-col grow space-y-1 justify-between w-full h-full sm:w-[240px]">
                    <Label>From</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn("w-full justify-start text-left font-normal", !fromDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={fromDate} onSelect={setFromDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* To Date Selector */}
                <div className="flex flex-col grow space-y-1 justify-between w-full h-full sm:w-[240px]">
                    <Label>To</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn("w-full justify-start text-left font-normal", !toDate && "text-muted-foreground")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={toDate} onSelect={setToDate} initialFocus />
                        </PopoverContent>
                    </Popover>
                </div>

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

                {/* Edit Button */}
                <div className="flex flex-col space-y-1 w-full sm:w-auto self-stretch justify-end">
                    <Button
                        disabled={txnIDs.length === 0}
                        onClick={onEditSelected}>
                        Edit Similar
                    </Button>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button disabled={txnIDs.length === 0}>Edit</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Request Tag Changes</DialogTitle>
                                <DialogDescription>
                                    Add, remove or clear tags for the {txnIDs.length} selected transactions
                                </DialogDescription>
                            </DialogHeader>
                            <EditDialog txnIDs={txnIDs} tags={tags} />
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card >
    );
}