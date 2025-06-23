"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  field: string;
  value: string;
  setValue: (s: string) => void;
};

function checkDate(v: string): boolean {
  const regex = /^(\d{4})\/(\d{2})\/(\d{2})$/;
  const match = v.match(regex);

  if (!match) {
    return false;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  // 3. Basic range checks for month and day (before Date object validation).
  if (month < 1 || month > 12) {
    return false;
  }
  if (day < 1 || day > 31) {
    // Max day can be 31, actual max depends on month/year
    return false;
  }

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 && // Check against 0-indexed month
    date.getDate() === day
  );
}

export default function DateSearchField({ field, value, setValue }: Props) {
  const checkedValue = checkDate(value) ? value : "";
  if (checkedValue !== value) {
    setValue(checkedValue);
  }
  const [internalValue, setInternalValue] = useState<string>(checkedValue);
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const empty = checkedValue.length === 0;
  const onValueChange = (v: string) => {
    if (!checkDate(v)) {
      toast.error(`${v} is not a valid date in the yyyy/mm/dd format`);
      setInternalValue(checkedValue);
      return;
    }
    setValue(v);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onValueChange(internalValue);
      setPopoverOpen(false);
    }
  };
  return (
    <div className="flex flex-col grow space-y-1 w-full sm:w-[240px]">
      <Label>{field}</Label>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              empty && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {empty ? <span>Pick a date</span> : checkedValue}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Input
            placeholder={`Enter ${field.toLowerCase()}`}
            value={internalValue}
            onChange={(e) => setInternalValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
