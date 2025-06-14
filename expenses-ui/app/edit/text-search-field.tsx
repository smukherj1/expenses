"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export type OpType = "all" | "match" | "not-match" | "empty"

type Props = {
    field: string
    value: string
    setValue: (s: string) => (void)
    op: OpType
    setOp: (op: OpType) => void
    allowEmpty?: boolean
}

export default function TextSearchField({ field, value, setValue, op, setOp, allowEmpty }: Props) {
    const [inputEnabled, setInputEnabled] = useState<boolean>(false);
    const onSelectChange = (v: OpType) => {
        if (v === "all" || v === "empty") {
            setInputEnabled(false);
            setValue("");
        } else {
            setInputEnabled(true);
        }
        setOp(v);
    };
    return <div className="flex flex-col grow space-y-1 w-full sm:w-[240px]">
        <div className="flex items-center justify-between">
            <Label>{field}</Label>
            <Select value={op} onValueChange={onSelectChange}>
                <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Match type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="match">Matching Any</SelectItem>
                    <SelectItem value="not-match">Not Matching</SelectItem>
                    {allowEmpty && <SelectItem value="empty">Empty</SelectItem>}
                </SelectContent>
            </Select>
        </div>
        <Input
            placeholder={`Enter ${field.toLowerCase()}`}
            disabled={!inputEnabled}
            value={value}
            onChange={(e) => setValue(e.target.value)}
        />
    </div>;
}