"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoaderIcon, CircleCheck, CircleX } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter } from 'next/navigation'


export type Props = {
    txnIDs: string[]
    tags: string
    setTags: (s: string) => void
}

export default function EditDialogBody({ txnIDs, tags, setTags }: Props) {
    const [curState, setCurState] = useState<"init" | "requested" | "response">("init");
    const [editOp, setEditOp] = useState<string>("add");
    const [responseSuccess, setResponseSuccess] = useState<boolean>(true);
    const [responseDetails, setResponseDetails] = useState<string>("");
    const router = useRouter();
    async function requestEdit() {
        setCurState("requested");
        const url = `/edit/submit`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ids: txnIDs,
                    op: editOp,
                    tags: tags.split(" ").filter((t) => t.length > 0),
                })
            });
            if (response.ok) {
                setResponseSuccess(true);
                router.refresh();
            } else {
                setResponseSuccess(false);
                const text = await response.json();
                const details = text.details === undefined ? '' : text.details;
                setResponseDetails(`${response.status} ${details}`);
            }
        } catch (error) {
            setResponseSuccess(false);
            setResponseDetails(`${error}`);
        }
        setCurState("response");
    }
    if (curState == "init") {
        return <div className="flex flex-row sd:flex-col gap-x-1">
            <Select value={editOp} onValueChange={setEditOp}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="add">Add</SelectItem>
                    <SelectItem value="remove">Remove</SelectItem>
                    <SelectItem value="clear">Clear</SelectItem>
                </SelectContent>
            </Select>
            <Input
                id="tags-edit-input"
                placeholder="Enter new tags"
                className="w-full"
                disabled={editOp == "clear"}
                value={tags}
                onChange={(e) => { setTags(e.target.value) }}
            />
            <Button onClick={async () => await requestEdit()}>Submit</Button>
        </div>;
    } else if (curState == "requested") {
        return <LoaderIcon className="animate-spin" />
    } else if (curState == "response") {
        if (responseSuccess) {
            return <><CircleCheck />Successfully updated tags on {txnIDs.length} transactions</>
        }
        return <><CircleX />Error updating tags on {txnIDs.length} transactions: {responseDetails}</>
    }
}