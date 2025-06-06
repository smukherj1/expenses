"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export type Props = {
    tags: string
}

export default function EditDialog({ tags }: Props) {
    const [newTags, setNewTags] = useState<string>(tags);
    return <div className="flex flex-col space-y-1 w-full flex-grow">
        <Label htmlFor="tags-edit-input">Tags</Label>
        <Input
            id="tags-edit-input"
            placeholder="Enter new tags"
            className="w-full"
            value={newTags}
            onChange={(e) => { setNewTags(e.target.value) }}
        />
    </div>
}