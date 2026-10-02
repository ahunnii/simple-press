"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";

import type { PanelVariant } from "./panel-variant";
import type { TemplateSection } from "~/lib/template-sections";
import { formatNoteScope, MAX_NOTE_ATTACHMENTS } from "~/lib/editor-notes";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useDeferredImageUpload } from "~/hooks/use-deferred-image-upload";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";

import {
  PANEL_ASIDE_CLASS,
  PANEL_CLOSE_BUTTON_CLASS,
  PANEL_SHEET_BODY_CLASS,
} from "./panel-variant";

/**
 * What a note points at. Stored as a KIND (not a page key) so switching
 * pages mid-compose never leaves the Select holding a value that no longer
 * matches any item — "This page" simply follows whichever page is open.
 */
type ScopeKind = "site" | "page" | "section";

const BODY_PLACEHOLDER: Record<ScopeKind, string> = {
  site: "What would you like changed across the site?",
  page: "What would you like changed on this page?",
  section: "What would you like changed in this section?",
};

const PHOTO_CAP_MESSAGE = `Up to ${MAX_NOTE_ATTACHMENTS} photos per note`;

/** A nonce'd "the owner clicked this section in the preview" request. */
export type NoteSectionPick = { id: string; nonce: number };

type NotesPanelProps = {
  /** The page currently open in the editor, e.g. "homepage" or "cms:<pageId>". */
  activePageKey: string;
  /** Human label for the active page, e.g. "Homepage" or the CMS page title. */
  activePageLabel: string;
  /**
   * Sections a note can point at while this page is open: the page's own
   * sections (rail order) followed by site-wide (`page === "global"`) ones.
   * Already filtered by the parent; empty when nothing is pickable.
   */
  sections: TemplateSection[];
  /**
   * Latest section clicked in the preview while Notes is open. A new `nonce`
   * switches the composer to that section; a pick that already existed when
   * the panel mounted is ignored.
   */
  pickedSection: NoteSectionPick | null;
  /** Desktop right column (default) or compact bottom-sheet content. */
  variant?: PanelVariant;
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
 * whole site, the page currently open in the editor, or one section of it
 * (picked from a dropdown or by clicking it in the preview), attach up to
 * `MAX_NOTE_ATTACHMENTS` photos, and see the status of notes they've already
 * sent, including any reply from the site team.
 * Self-contained: fetches and mutates via `api.editorNote` directly rather
 * than routing through the draft-patch pipeline the other panels use, since
 * notes aren't part of the publish/discard draft.
 */
export function NotesPanel({
  activePageKey,
  activePageLabel,
  sections,
  pickedSection,
  variant = "sidebar",
  onClose,
}: NotesPanelProps) {
  const utils = api.useUtils();
  const notesQuery = api.editorNote.listMine.useQuery();
  // Toasts + cache refresh live in `handleSubmit` — it has to sequence the
  // photo upload, the create, and the discard-on-failure cleanup.
  const createNote = api.editorNote.create.useMutation();
  const {
    pendingFiles,
    isPreparing,
    isUploading,
    addFiles,
    removeFile,
    clear,
    uploadAll,
    discard,
  } = useDeferredImageUpload({ route: "editorNoteImages" });

  const [scopeKind, setScopeKind] = React.useState<ScopeKind>("page");
  const [sectionId, setSectionId] = React.useState<string | null>(null);
  const [scopeTouched, setScopeTouched] = React.useState(false);
  const [body, setBody] = React.useState("");

  const composerRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const submittingRef = React.useRef(false);

  // Keep the default scope pointed at whatever page is open, but only while
  // the owner hasn't deliberately picked a scope themselves — otherwise
  // switching pages mid-compose would silently change their selection. A
  // picked section that doesn't exist on the new page (and isn't site-wide)
  // is dropped rather than carried over.
  React.useEffect(() => {
    if (!scopeTouched) setScopeKind("page");
    setSectionId((current) =>
      current && sections.some((s) => s.id === current) ? current : null,
    );
    // Nothing to pick on this page — "section" would be a dead end.
    if (sections.length === 0) {
      setScopeKind((kind) => (kind === "section" ? "page" : kind));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageKey, sections]);

  // A section clicked in the preview while Notes is open. Only NEW nonces
  // count — a request left over from before this panel mounted is stale.
  const handledPickNonceRef = React.useRef(pickedSection?.nonce ?? null);
  React.useEffect(() => {
    if (!pickedSection) return;
    if (pickedSection.nonce === handledPickNonceRef.current) return;
    handledPickNonceRef.current = pickedSection.nonce;
    setScopeKind("section");
    setSectionId(pickedSection.id);
    setScopeTouched(true);
    composerRef.current?.scrollIntoView({ block: "nearest" });
  }, [pickedSection]);

  const selectedSection =
    scopeKind === "section"
      ? (sections.find((s) => s.id === sectionId) ?? null)
      : null;
  const pageSections = sections.filter((s) => s.page !== "global");
  const siteWideSections = sections.filter((s) => s.page === "global");

  const remainingSlots = MAX_NOTE_ATTACHMENTS - pendingFiles.length;
  const isBusy = isUploading || createNote.isPending;
  const trimmedBody = body.trim();
  const canSubmit =
    trimmedBody.length > 0 &&
    !isBusy &&
    !isPreparing &&
    (scopeKind !== "section" || selectedSection !== null);

  const handleFilesSelected = (list: FileList | null) => {
    const files = list ? Array.from(list) : [];
    if (files.length === 0) return;
    if (files.length > remainingSlots) toast.warning(PHOTO_CAP_MESSAGE);
    // Keep the first files that fit. The Add button is disabled while a
    // previous batch is still being prepared, so `pendingFiles` is current.
    const fitting = files.slice(0, Math.max(0, remainingSlots));
    if (fitting.length > 0) addFiles(fitting);
  };

  const handleSubmit = async () => {
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    try {
      let urls: string[] = [];
      if (pendingFiles.length > 0) {
        try {
          // uploadAll discards any partial batch itself before rethrowing.
          urls = (await uploadAll()).map((r) => r.url);
        } catch (error) {
          toast.error(
            error instanceof Error && error.message
              ? error.message
              : "Couldn't upload your photos",
          );
          return;
        }
      }

      const isSite = scopeKind === "site";
      try {
        await createNote.mutateAsync({
          body: trimmedBody,
          pageKey: isSite ? null : activePageKey,
          pageLabel: isSite ? null : activePageLabel,
          sectionKey: selectedSection?.id ?? null,
          sectionLabel: selectedSection?.title ?? null,
          attachmentUrls: urls,
        });
      } catch (error) {
        // The photos made it to storage but the note didn't — don't orphan them.
        discard(urls);
        toast.error(
          (error instanceof Error && error.message) ||
            "Couldn't send your note",
        );
        return;
      }

      setBody("");
      clear();
      toast.success("Note sent — we'll take a look");
      await utils.editorNote.listMine.invalidate();
    } finally {
      submittingRef.current = false;
    }
  };

  const submitLabel = isPreparing
    ? "Preparing…"
    : isUploading
      ? "Uploading…"
      : createNote.isPending
        ? "Sending…"
        : "Send note";

  const notes = notesQuery.data ?? [];

  return (
    <aside className={PANEL_ASIDE_CLASS[variant]}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">Notes</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Leave a note about anything you&apos;d like changed — we&apos;ll get
            back to you.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={PANEL_CLOSE_BUTTON_CLASS[variant]}
          aria-label="Close notes panel"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div
        className={cn(
          "flex-1 overflow-y-auto px-4 py-4",
          variant === "sheet" && PANEL_SHEET_BODY_CLASS,
        )}
      >
        {/* Compose */}
        <div ref={composerRef} className="scroll-mt-4 space-y-3 border-b pb-4">
          <div className="space-y-2">
            <Label htmlFor="note-scope">Scope</Label>
            <Select
              value={scopeKind}
              onValueChange={(value) => {
                setScopeTouched(true);
                setScopeKind(value as ScopeKind);
              }}
            >
              <SelectTrigger id="note-scope" className="w-full">
                <SelectValue placeholder="Choose scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="site">Whole site</SelectItem>
                <SelectItem value="page">
                  This page: {activePageLabel}
                </SelectItem>
                <SelectItem value="section" disabled={sections.length === 0}>
                  A section on this page
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scopeKind === "section" && (
            <div className="space-y-2">
              <Label htmlFor="note-section">Section</Label>
              <Select
                value={selectedSection?.id ?? ""}
                onValueChange={(value) => {
                  setScopeTouched(true);
                  setSectionId(value);
                }}
              >
                <SelectTrigger
                  id="note-section"
                  className="w-full"
                  aria-describedby="note-section-hint"
                >
                  <SelectValue placeholder="Choose a section" />
                </SelectTrigger>
                <SelectContent>
                  {pageSections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                  {pageSections.length > 0 && siteWideSections.length > 0 && (
                    <SelectSeparator />
                  )}
                  {siteWideSections.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Site-wide</SelectLabel>
                      {siteWideSections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              <p
                id="note-section-hint"
                className="text-muted-foreground text-xs"
              >
                Or click a section in the preview.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note-body">Note</Label>
            <Textarea
              id="note-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={BODY_PLACEHOLDER[scopeKind]}
              rows={4}
              maxLength={2000}
            />
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                handleFilesSelected(event.target.files);
                // Allow re-picking the same file after removing it.
                event.target.value = "";
              }}
            />
            {pendingFiles.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Attached photos">
                {pendingFiles.map((pf, index) => (
                  <li key={pf.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a
                        blob: preview at a fixed 64px; next/image can't
                        optimize object URLs. */}
                    <img
                      src={pf.previewUrl}
                      alt={`Photo ${index + 1}`}
                      className="h-16 w-16 rounded-md border object-cover"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full border shadow-sm"
                      aria-label={`Remove photo ${index + 1}`}
                      disabled={isBusy}
                      onClick={() => removeFile(pf.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between gap-2">
              {remainingSlots > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPreparing || isBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  Add photos
                </Button>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground text-xs tabular-nums">
                {pendingFiles.length}/{MAX_NOTE_ATTACHMENTS}
                <span className="sr-only"> photos attached</span>
              </span>
            </div>
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {submitLabel}
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
                  {formatNoteScope({
                    pageLabel: note.pageLabel,
                    sectionLabel: note.sectionLabel,
                  })}
                </Badge>
                <StatusBadge status={note.status as "open" | "resolved"} />
              </div>

              <p className="whitespace-pre-wrap">{note.body}</p>

              {note.attachmentUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {note.attachmentUrls.map((url, index) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- an
                          arbitrary storage URL at a fixed 64px; next/image's
                          loader buys nothing here. */}
                      <img
                        src={url}
                        alt={`Attachment ${index + 1}`}
                        loading="lazy"
                        className="h-16 w-16 rounded-md border object-cover"
                      />
                    </a>
                  ))}
                </div>
              )}

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
