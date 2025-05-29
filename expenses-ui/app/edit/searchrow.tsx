"use client";

import React, { useState, useEffect, use } from "react";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedCallback } from 'use-debounce';
import { usePathname, useRouter } from 'next/navigation';
import { formatDate } from "../utils";

export interface SearchParams {
    tagged: string
    fromDate: string | undefined
    toDate: string | undefined
    description: string
};

// Update the function signature to accept props
export function SearchRow() {
    const [tagged, setTagged] = useState<string>("no");
    const [fromDate, setFromDate] = useState<Date | undefined>(
        new Date("2014-01-01")
    );
    const [toDate, setToDate] = useState<Date | undefined>(new Date());
    const [description, setDescription] = useState<string>("");
    const { replace } = useRouter();
    const pathname = usePathname();

    function searchParams(): string {
        const params = new URLSearchParams();
        if (tagged.length > 0) {
            params.set('tagged', tagged);
        }
        if (fromDate != undefined) {
            params.set('fromDate', formatDate(fromDate));
        }
        if (toDate != undefined) {
            params.set('toDate', formatDate(toDate));
        }
        if (description.length > 0) {
            params.set('description', description);
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
        [tagged, fromDate, toDate, description]
    );
    return (
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 p-4 bg-gray-50 rounded-lg shadow-sm">
            {/* Tagged Selection Menu */}
            <div className="flex flex-col space-y-1 w-full sm:w-auto">
                <Label htmlFor="tagged-select">Tagged</Label>
                <Select
                    value={tagged}
                    onValueChange={setTagged}
                >
                    <SelectTrigger id="tagged-select" className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                </Select>
            </div>

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
                    onChange={(e) => setDescription(e.target.value.toLowerCase().trim())}
                    className="w-full"
                />
            </div>
        </div>
    );
}