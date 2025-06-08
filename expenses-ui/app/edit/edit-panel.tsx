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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedCallback } from 'use-debounce';
import { usePathname, useRouter } from 'next/navigation';
import { formatDate } from "../utils";
import EditDialog from "./edit-dialog";

export type Props = {
    txnIDs: string[]
}

export function EditPanel({ txnIDs }: Props) {
    const [fromDate, setFromDate] = useState<Date | undefined>(
        new Date("2014-01-01")
    );
    const [toDate, setToDate] = useState<Date | undefined>(new Date());
    const [description, setDescription] = useState<string>("");
    const [source, setSource] = useState<string>("");
    const [tags, setTags] = useState<string>("");
    const { replace } = useRouter();
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
        }
        if (source.length > 0) {
            params.set('source', source);
        }
        if (tags.length > 0) {
            params.set('tags', tags);
        }
        return `${params.toString()}`;
    }
    const debouncedSearch = useDebouncedCallback(() => {
        const sp = searchParams();
        replace(`${pathname}?${sp}`);
    }, 300);
    useEffect(() => {
        debouncedSearch();
    },
        [fromDate, toDate, description, source, tags]
    );
    return (
        <Card className="gap-1 py-3 bg-gray-50 shadow-sm">
            <CardHeader>
                <CardTitle>Search for transactions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 p-2 rounded-lg">
                {/* From Date Selector */}
                <div className="flex flex-col space-y-1 w-full sm:w-auto">
                    <Label htmlFor="from-date-picker">From</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="from-date-picker"
                                variant={"outline"}
                                className={cn(
                                    "w-full sm:w-[240px] justify-start text-left font-normal",
                                    !fromDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={fromDate}
                                onSelect={setFromDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* To Date Selector */}
                <div className="flex flex-col space-y-1 w-full sm:w-auto">
                    <Label htmlFor="to-date-picker">To</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="to-date-picker"
                                variant={"outline"}
                                className={cn(
                                    "w-full sm:w-[240px] justify-start text-left font-normal",
                                    !toDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={toDate}
                                onSelect={setToDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Description Free Text Input */}
                <div className="flex flex-col space-y-1 w-full flex-grow">
                    <Label htmlFor="description-input">Description</Label>
                    <Input
                        id="description-input"
                        placeholder="Enter description"
                        value={description} // Bind to prop
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full"
                    />
                </div>
                {/* Source Free Text Input */}
                <div className="flex flex-col space-y-1 w-full flex-grow">
                    <Label htmlFor="source-input">Source</Label>
                    <Input
                        id="source-input"
                        placeholder="Enter source"
                        value={source} // Bind to prop
                        onChange={(e) => setSource(e.target.value)}
                        className="w-full"
                    />
                </div>
                {/* Tags Free Text Input */}
                <div className="flex flex-col space-y-1 w-full flex-grow">
                    <Label htmlFor="tags-input">Tags</Label>
                    <Input
                        id="tags-input"
                        placeholder="Enter tags"
                        value={tags} // Bind to prop
                        onChange={(e) => setTags(e.target.value)}
                        className="w-full"
                    />
                </div>
                {/* Edit Button */}
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="flex self-end" disabled={txnIDs.length === 0}>Edit</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Request Tag Changes</DialogTitle>
                            <DialogDescription>
                                Add, remove or clear tags for the {txnIDs.length} selected transactions
                            </DialogDescription>
                        </DialogHeader>
                        {/* Tags Free Text Input */}
                        <EditDialog txnIDs={txnIDs} tags={tags} />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}