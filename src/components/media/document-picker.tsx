/**
 * "Choose a file" — pick a PDF from the Media Library (or upload one on the
 * spot) and hand back its public link. Shared by the rich-text link dialog,
 * template `url` fields (site-wide, list rows, visual editor) and the
 * navigation builder.
 *
 * Two shapes:
 *  - default: a trigger button + non-modal Popover. `modal={false}` so it
 *    can open inside a vaul sheet or Radix dialog without the nested-modal
 *    body pointer-events lock (same reason as the upload menus).
 *  - `inline`: a ghost toggle + an inline panel, for the link bubble menu
 *    where focus moving into a portal would blur the editor and dismiss the
 *    menu (see `SiteLinkPicker`).
 *
 * Every tRPC hook lives in `DocumentPickerPanel`, which mounts only while the
 * picker is open, so a closed picker costs nothing (and component tests that
 * stub `~/trpc/react` don't need to stub the media procedures).
 *
 * The list is `media.list` (`platformMedia.list` for a hub `businessId`),
 * which is gated behind the Media Library flag and owner/manager only. When
 * it's off (`libraryEnabled={false}`) or the list errors, the picker degrades
 * to upload-only — uploads go through the ungated `libraryDocuments` route.
 */
"use client";

import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { ChevronDown, FileText, Loader2, Upload } from "lucide-react";

import { formatBytes } from "~/lib/format-bytes";
import { documentDisplayName } from "~/lib/s3/pdf";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useDocumentUpload } from "~/hooks/use-document-upload";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

/** What `onSelect` receives besides the URL. */
export type PickedDocument = {
  /** Human file name, e.g. `annual-report.pdf`. */
  name: string;
  /** Storage key, `{biz}/library-doc-….pdf`. */
  key: string;
};

export interface DocumentPickerProps {
  /** Called with the PDF's public (absolute https) URL. */
  onSelect: (url: string, doc: PickedDocument) => void;
  /**
   * Platform hub only: list/upload THIS business's PDFs instead of the
   * request host's (`platformMedia.list` + hub upload). Omit everywhere else.
   */
  businessId?: string;
  /**
   * `false` when the caller knows the Media Library flag is off: skips the
   * list query and shows upload-only. Omitted = try the list and fall back
   * to upload-only if it errors.
   */
  libraryEnabled?: boolean;
  /** Popover mode: replaces the default "Choose a file" button (`asChild`). */
  trigger?: ReactNode;
  /** Accessible name for the default trigger when several share a page. */
  triggerAriaLabel?: string;
  /** Render as an inline toggle + panel instead of a Popover. */
  inline?: boolean;
  className?: string;
}

export function DocumentPicker({
  onSelect,
  businessId,
  libraryEnabled,
  trigger,
  triggerAriaLabel,
  inline = false,
  className,
}: DocumentPickerProps) {
  const [open, setOpen] = useState(false);

  const pick = (url: string, doc: PickedDocument) => {
    onSelect(url, doc);
    setOpen(false);
  };

  const panel = (
    <DocumentPickerPanel
      businessId={businessId}
      libraryEnabled={libraryEnabled}
      onPick={pick}
      className={inline ? "rounded-md border" : undefined}
    />
  );

  if (inline) {
    return (
      <div className={cn("space-y-1", className)}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground -ml-2 h-7 px-2 text-xs"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <FileText className="size-3.5" />
          Link to a file
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              open && "rotate-180",
            )}
          />
        </Button>
        {open && panel}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="outline"
            className={cn("shrink-0", className)}
            aria-label={triggerAriaLabel}
          >
            <FileText className="size-4" />
            Choose a file
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {panel}
      </PopoverContent>
    </Popover>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

function DocumentPickerPanel({
  businessId,
  libraryEnabled,
  onPick,
  className,
}: {
  businessId?: string;
  libraryEnabled?: boolean;
  onPick: (url: string, doc: PickedDocument) => void;
  className?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listEnabled = libraryEnabled !== false;

  // Both hooks are always called (hooks can't be conditional); only the one
  // for this context is enabled. `retry: false` so a flag-off FORBIDDEN
  // falls straight through to upload-only.
  const shopList = api.media.list.useQuery(
    {},
    { enabled: listEnabled && !businessId, retry: false },
  );
  const hubList = api.platformMedia.list.useQuery(
    { businessId: businessId ?? "" },
    { enabled: listEnabled && !!businessId, retry: false },
  );
  const list = businessId ? hubList : shopList;

  const documents = useMemo(
    () =>
      (list.data?.items ?? [])
        .filter((item) => item.kind === "document")
        .map((item) => ({
          key: item.key,
          url: item.url,
          size: item.size,
          lastModified: new Date(item.lastModified),
          name: documentDisplayName(item.key),
        }))
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()),
    [list.data],
  );

  // The hook toasts skips/failures and refreshes the list cache itself; the
  // first PDF that lands is picked (the input takes one file at a time).
  const { upload, isPending } = useDocumentUpload({ businessId });
  const handleFiles = async (files: File[]) => {
    const [uploaded] = await upload(files);
    if (uploaded)
      onPick(uploaded.url, { name: uploaded.name, key: uploaded.key });
  };

  const unavailable = !listEnabled || list.isError;
  const emptyMessage = unavailable
    ? "Upload a PDF to link to it."
    : list.isLoading
      ? "Loading…"
      : documents.length === 0
        ? "No PDFs yet"
        : "No matching PDFs.";

  return (
    <Command className={cn("h-auto", className)}>
      {!unavailable && <CommandInput placeholder="Search PDFs…" />}
      <CommandList className="max-h-56">
        <CommandEmpty>{emptyMessage}</CommandEmpty>
        {documents.length > 0 && (
          <CommandGroup heading="Your PDFs">
            {documents.map((doc) => (
              <CommandItem
                key={doc.key}
                // The key keeps same-named files distinct for cmdk.
                value={`${doc.name} ${doc.key}`}
                onSelect={() =>
                  onPick(doc.url, { name: doc.name, key: doc.key })
                }
              >
                <FileText />
                {/* Name on its own line: the popover is narrow, and the
                    name is what the owner is scanning for. */}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{doc.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {formatBytes(doc.size)} ·{" "}
                    {doc.lastModified.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <div className="border-t p-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          disabled={isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {isPending ? "Uploading…" : "Upload a PDF"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            // Reset so picking the same file again still fires `change`.
            e.target.value = "";
            if (files.length > 0) void handleFiles(files);
          }}
        />
      </div>
    </Command>
  );
}
