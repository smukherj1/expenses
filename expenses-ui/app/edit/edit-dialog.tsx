"use client";

import { Label } from "@/components/ui/label";
import { useState } from "react";
import EditDialogBody from "./edit-dialog-body";

export type Props = {
    txnIDs: string[]
    tags: string
}

export default function EditDialog({ txnIDs, tags }: Props) {
    const [newTags, setNewTags] = useState<string>(tags);
    return <div className="flex flex-col space-y-1 w-full flex-grow">
        <Label htmlFor="tags-edit-input">Tags</Label>
        <EditDialogBody txnIDs={txnIDs} tags={newTags} setTags={setNewTags} />
    </div>
}