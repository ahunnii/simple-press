"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";

type NoteRow = RouterOutputs["editorNote"]["platformList"]["notes"][number];

type Props = {
  note: NoteRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ResolveNoteDialog({ note, open, onOpenChange }: Props) {
  const router = useRouter();
  const [response, setResponse] = useState("");

  // The dialog stays mounted across notes (swapped via the `note` prop rather
  // than remounted with a `key`), so reseed local state whenever it opens.
  useEffect(() => {
    if (open) {
      setResponse("");
    }
  }, [open]);

  const resolveNote = api.editorNote.resolve.useMutation({
    onSuccess: () => {
      toast.success("Note marked as resolved");
      onOpenChange(false);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to resolve note");
    },
  });

  const handleResolve = () => {
    if (!note) return;
    resolveNote.mutate({
      id: note.id,
      response: response.trim().length > 0 ? response.trim() : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Note</DialogTitle>
          <DialogDescription>
            {note && `From ${note.business.name} (${note.business.subdomain})`}
          </DialogDescription>
        </DialogHeader>

        {note && (
          <div className="space-y-4 py-2">
            <div>
              <Badge variant="outline">{note.pageLabel ?? "Whole site"}</Badge>
              <p className="text-foreground mt-2 text-sm whitespace-pre-wrap">
                {note.body}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolve-note-response">Reply (optional)</Label>
              <Textarea
                id="resolve-note-response"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Let them know what changed..."
                rows={4}
                maxLength={2000}
                disabled={resolveNote.isPending}
              />
              <p className="text-muted-foreground text-xs">
                The client will see this in their site editor.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={resolveNote.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleResolve}
            disabled={resolveNote.isPending || !note}
          >
            {resolveNote.isPending ? "Resolving..." : "Mark resolved"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
