"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";

type Props = {
  orderId: string;
  internalNote: string | null;
  customerNote: string | null;
};

export function OrderNotes({ orderId, internalNote, customerNote }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(internalNote ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) textareaRef.current?.focus();
  }, [isEditing]);

  const updateNote = api.order.updateNote.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Note saved");
      setIsEditing(false);
      void utils.order.invalidate();
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to save note");
    },
    onMutate: () => {
      toast.loading("Saving note...");
    },
  });

  const handleSave = () => {
    updateNote.mutate({
      orderId,
      internalNote: draft.trim() || null,
    });
  };

  const handleCancel = () => {
    setDraft(internalNote ?? "");
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Notes</CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-muted-foreground h-7 gap-1.5 text-xs"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Internal note — always shown, editable */}
        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
            Internal Note
            <span className="text-muted-foreground/70 ml-1 normal-case">
              (not visible to customer)
            </span>
          </p>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Add an internal note..."
                rows={4}
                className="resize-none text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateNote.isPending}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={updateNote.isPending}
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p
              className="text-foreground min-h-8 cursor-text text-sm whitespace-pre-wrap"
              onClick={() => setIsEditing(true)}
            >
              {internalNote ?? (
                <span className="text-muted-foreground italic">
                  No internal note
                </span>
              )}
            </p>
          )}
        </div>

        {/* Customer note — read-only, only shown if present */}
        {customerNote && (
          <div className="border-t pt-4">
            <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
              Customer Note
            </p>
            <p className="text-foreground text-sm whitespace-pre-wrap">
              {customerNote}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
