"use client";

import { useReducer, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoaderIcon, CircleCheck, CircleX } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

// Define an enum for our component states for better readability
enum FormState {
  IDLE = "idle",
  SUBMITTING = "submitting",
  SUCCESS = "success",
  ERROR = "error",
}

// Define the shape of our component's internal state
interface State {
  formState: FormState;
  editOp: string;
  responseDetails: string;
}

// Define the actions that can be dispatched to our reducer
type Action =
  | { type: "SET_EDIT_OP"; payload: string }
  | { type: "SUBMIT_REQUEST" }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_ERROR"; payload: string }
  | { type: "RESET_FORM" };

// Our reducer function to handle state transitions
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_EDIT_OP":
      return { ...state, editOp: action.payload };
    case "SUBMIT_REQUEST":
      return { ...state, formState: FormState.SUBMITTING, responseDetails: "" };
    case "SUBMIT_SUCCESS":
      return { ...state, formState: FormState.SUCCESS };
    case "SUBMIT_ERROR":
      return {
        ...state,
        formState: FormState.ERROR,
        responseDetails: action.payload,
      };
    case "RESET_FORM":
      return { ...state, formState: FormState.IDLE, responseDetails: "" };
    default:
      return state;
  }
}

export type Props = {
  txnIDs: string[];
  tags: string;
  setTags: (s: string) => void;
  onSubmit: () => void;
};

export default function EditDialogBody({
  txnIDs,
  tags,
  setTags,
  onSubmit,
}: Props) {
  const router = useRouter();

  const [state, dispatch] = useReducer(reducer, {
    formState: FormState.IDLE,
    editOp: "add",
    responseDetails: "",
  });

  const { formState, editOp, responseDetails } = state;

  // Use useCallback for memoizing event handlers
  const handleEditOpChange = useCallback((value: string) => {
    dispatch({ type: "SET_EDIT_OP", payload: value });
  }, []);

  const handleTagsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTags(e.target.value);
    },
    [setTags]
  );

  const requestEdit = useCallback(async () => {
    dispatch({ type: "SUBMIT_REQUEST" });
    onSubmit(); // Notify parent component if necessary

    const url = `/edit/submit`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: txnIDs,
          op: editOp,
          tags: tags.split(" ").filter((t) => t.length > 0),
        }),
      });

      if (response.ok) {
        dispatch({ type: "SUBMIT_SUCCESS" });
        router.refresh(); // Revalidate data
        // Optionally, reset the form after a short delay for user feedback
        // setTimeout(() => dispatch({ type: "RESET_FORM" }), 2000);
      } else {
        const errorText = await response.json();
        const details = errorText.details || "";
        dispatch({
          type: "SUBMIT_ERROR",
          payload: `${response.status}: ${details}`,
        });
      }
    } catch (error) {
      // Type assertion for error is good practice
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      dispatch({ type: "SUBMIT_ERROR", payload: errorMessage });
    }
  }, [txnIDs, editOp, tags, onSubmit, router]);

  // Conditional rendering based on formState
  switch (formState) {
    case FormState.IDLE:
      return (
        <div className="flex flex-row sd:flex-col gap-x-1">
          <Select value={editOp} onValueChange={handleEditOpChange}>
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
            disabled={editOp === "clear"}
            value={tags}
            onChange={handleTagsChange}
          />
          <Button onClick={requestEdit}>Submit</Button>
        </div>
      );
    case FormState.SUBMITTING:
      return <LoaderIcon className="animate-spin" />;
    case FormState.SUCCESS:
      return (
        <div className="flex items-center gap-x-2 text-green-600">
          <CircleCheck />
          Successfully updated tags!
          {/* Add a button to reset the form or close the dialog */}
          <Button onClick={() => dispatch({ type: "RESET_FORM" })}>OK</Button>
        </div>
      );
    case FormState.ERROR:
      return (
        <div className="flex items-center gap-x-2 text-red-600">
          <CircleX />
          Error updating tags: {responseDetails}
          {/* Allow user to retry or reset */}
          <Button onClick={() => dispatch({ type: "RESET_FORM" })}>
            Try Again
          </Button>
        </div>
      );
    default:
      return null; // Should ideally not happen
  }
}
