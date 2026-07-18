"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

/** Sentinel scope value meaning "not scoped to a specific page". */
const SITE_SCOPE_VALUE = "__site__";

type NotesPanelProps = {
  /** The page currently open in the editor, e.g. "homepage" or "cms:<pageId>". */
  activePageKey: string;
  /** Human label for the active page, e.g. "Homepage" or the CMS page title. */
  activePageLabel: string;
  /** Close the panel. */
  onClose: () => void;
};

function StatusBadge({ status }: { status: "open" | "resolved" }) {
  if (status === "resolved") {
    return (
      <Badge
        variant="outline"
        className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
      >
        Resolved
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
    >
      Open
    </Badge>
  );
}

/**
 * Right-hand "leave feedback" panel. Owners can jot a note scoped to the
 * page currently open in the editor (or the whole site) and see the status
 * of notes they've already sent, including any reply from the site team.
 * Self-contained: fetches and mutates via `api.editorNote` directly rather
 * than routing through the draft-patch pipeline the other panels use, since
 * notes aren't part of the publish/discard draft.
 */
export function NotesPanel({
  activePageKey,
  activePageLabel,
  onClose,
}: NotesPanelProps) {
  const utils = api.useUtils();
  const notesQuery = api.editorNote.listMine.useQuery();
  const createNote = api.editorNote.create.useMutation({
    onSuccess: async () => {
      setBody("");
      toast.success("Note sent — we'll take a look");
      await utils.editorNote.listMine.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Couldn't send your note");
    },
  });

  const [scope, setScope] = React.useState<string>(activePageKey);
  const [scopeTouched, setScopeTouched] = React.useState(false);
  const [body, setBody] = React.useState("");

  // Keep the default scope pointed at whatever page is open, but only while
  // the owner hasn't deliberately picked a scope themselves — otherwise
  // switching pages mid-compose would silently change their selection.
  React.useEffect(() => {
    if (!scopeTouched) {
      setScope(activePageKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageKey]);

  const trimmedBody = body.trim();
  const canSubmit = trimmedBody.length > 0 && !createNote.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const isSiteScope = scope === SITE_SCOPE_VALUE;
    createNote.mutate({
      body: trimmedBody,
      pageKey: isSiteScope ? null : activePageKey,
      pageLabel: isSiteScope ? null : activePageLabel,
    });
  };

  const notes = notesQuery.data ?? [];

  return (
    <aside className="bg-card animate-in slide-in-from-right-8 fade-in flex w-[380px] shrink-0 flex-col border-l duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">Notes</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Leave a note about anything you&apos;d like changed — we&apos;ll
            get back to you.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Close notes panel"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Compose */}
        <div className="space-y-3 border-b pb-4">
          <div className="space-y-2">
            <Label htmlFor="note-scope">Scope</Label>
            <Select
              value={scope}
              onValueChange={(value) => {
                setScopeTouched(true);
                setScope(value);
              }}
            >
              <SelectTrigger id="note-scope" className="w-full">
                <SelectValue placeholder="Choose scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={activePageKey}>
                  This page: {activePageLabel}
                </SelectItem>
                <SelectItem value={SITE_SCOPE_VALUE}>Whole site</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-body">Note</Label>
            <Textarea
              id="note-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What would you like changed on this page?"
              rows={4}
              maxLength={2000}
            />
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {createNote.isPending ? "Sending…" : "Send note"}
          </Button>
        </div>

        {/* List */}
        <div className="space-y-3 pt-4" aria-live="polite">
          {notesQuery.isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {!notesQuery.isLoading && notes.length === 0 && (
            <p className="text-muted-foreground text-sm">No notes yet.</p>
          )}

          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-muted/30 space-y-2 rounded-md border p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="secondary" className="text-xs font-normal">
                  {note.pageLabel ?? "Whole site"}
                </Badge>
                <StatusBadge status={note.status as "open" | "resolved"} />
              </div>

              <p className="whitespace-pre-wrap">{note.body}</p>

              <p className="text-muted-foreground text-xs">
                {formatDistanceToNow(new Date(note.createdAt), {
                  addSuffix: true,
                })}
              </p>

              {note.response && (
                <div className="bg-background rounded-md border p-2">
                  <p className="text-muted-foreground text-xs font-medium">
                    Reply from your site team
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{note.response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
