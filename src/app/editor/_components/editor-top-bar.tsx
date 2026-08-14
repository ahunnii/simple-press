"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  MessageSquare,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";

import type { DeviceKind } from "./editor-preview";
import { cn } from "~/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

/** Fallback Exit destination when no valid `?from=` deep link is present. */
const DEFAULT_EXIT_HREF = "/admin/content";

/** Only same-app admin paths are honored for `?from=` — never an open redirect. */
function isSafeExitDestination(value: string | null): value is string {
  return !!value && /^\/admin(\/|$)/.test(value);
}

export type EditorTopBarPage = { value: string; label: string };

/** CMS page Select entry (value = `cms:<id>`, label = draft title). */
export type EditorTopBarCmsPage = {
  value: string;
  label: string;
  unpublished?: boolean;
};

export type EditorTopBarProps = {
  businessName: string;
  templateId: string;
  /** Selectable template pages (value = page key, label = display name). */
  pages: EditorTopBarPage[];
  /** Selectable CMS pages, rendered in a second Select group. */
  cmsPages: EditorTopBarCmsPage[];
  /** Selectable blog posts, rendered in a third Select group. */
  blogPosts: EditorTopBarCmsPage[];
  activePage: string;
  onPageChange: (page: string) => void;
  device: DeviceKind;
  onDeviceChange: (device: DeviceKind) => void;
  /** True when there is a durable draft or the local state differs from live. */
  hasUnpublishedChanges: boolean;
  /** True while the publish mutation is running. */
  isPublishing: boolean;
  /** True while a draft flush is scheduled or in-flight (gates Exit confirm). */
  flushPending: boolean;
  /**
   * True from the moment publish/discard is clicked until it settles —
   * mirrors the `beforeunload` guard so Exit warns during this window too,
   * not just while a draft flush is pending.
   */
  mutationPending: boolean;
  /** True when autosave retries are exhausted — the last edit is NOT saved. */
  saveFailed: boolean;
  onPublish: () => void;
  onDiscard: () => void;
  /** Whether the Notes panel is currently open. */
  notesOpen: boolean;
  /** Count of the owner's still-open notes, shown as a badge. */
  openNotesCount: number;
  /** Toggle the Notes panel. */
  onToggleNotes: () => void;
};

const DEVICES: { kind: DeviceKind; label: string; Icon: typeof Monitor }[] = [
  { kind: "desktop", label: "Desktop preview", Icon: Monitor },
  { kind: "tablet", label: "Tablet preview (768px)", Icon: Tablet },
  { kind: "mobile", label: "Mobile preview (390px)", Icon: Smartphone },
];

/** Shared item rendering for CMS-backed Select groups (pages, blog posts). */
function CmsSelectItems({ items }: { items: EditorTopBarCmsPage[] }) {
  return (
    <>
      {items.map((item) => (
        <SelectItem key={item.value} value={item.value}>
          {item.label}
          {item.unpublished && (
            <span className="text-muted-foreground"> (unpublished)</span>
          )}
        </SelectItem>
      ))}
    </>
  );
}

/**
 * Fixed-height editor header: Exit + identity (left), page + device controls
 * (center), publish status + actions (right). Owns the confirm dialogs for
 * Exit (when a flush is pending) and Discard.
 */
export function EditorTopBar({
  businessName,
  templateId,
  pages,
  cmsPages,
  blogPosts,
  activePage,
  onPageChange,
  device,
  onDeviceChange,
  hasUnpublishedChanges,
  isPublishing,
  flushPending,
  mutationPending,
  saveFailed,
  onPublish,
  onDiscard,
  notesOpen,
  openNotesCount,
  onToggleNotes,
}: EditorTopBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [exitOpen, setExitOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const fromParam = searchParams.get("from");
  const exitHref = isSafeExitDestination(fromParam)
    ? fromParam
    : DEFAULT_EXIT_HREF;

  // Consistent with the beforeunload guard: warn on an unflushed draft edit
  // (flushPending, which itself covers scheduled-and-in-flight) OR while a
  // publish/discard mutation is settling.
  const handleExit = () => {
    if (flushPending || mutationPending) {
      setExitOpen(true);
    } else {
      router.push(exitHref);
    }
  };

  // Status precedence: failed > saving > dirty > clean.
  const statusLabel = saveFailed
    ? "Couldn't save"
    : flushPending
      ? "Saving…"
      : hasUnpublishedChanges
        ? "Unpublished changes"
        : "Published";

  return (
    <header className="bg-card flex h-14 shrink-0 items-center gap-3 border-b px-3">
      {/* Left: exit + identity */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleExit}
          className="shrink-0"
          aria-label="Exit editor"
        >
          <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Exit</span>
        </Button>
        <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
        <div className="hidden min-w-0 items-center gap-2 sm:flex">
          <span className="truncate text-sm font-medium">{businessName}</span>
          <Badge
            variant="outline"
            className="text-muted-foreground shrink-0 capitalize"
          >
            {templateId}
          </Badge>
        </div>
      </div>

      {/* Center: page + device */}
      <div className="flex shrink-0 items-center gap-3">
        <Select value={activePage} onValueChange={onPageChange}>
          <SelectTrigger size="sm" className="w-40" aria-label="Page to edit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Site pages</SelectLabel>
              {pages.map((page) => (
                <SelectItem key={page.value} value={page.value}>
                  {page.label}
                </SelectItem>
              ))}
            </SelectGroup>
            {cmsPages.length > 0 && (
              <SelectGroup>
                <SelectLabel>Your pages</SelectLabel>
                <CmsSelectItems items={cmsPages} />
              </SelectGroup>
            )}
            {blogPosts.length > 0 && (
              <SelectGroup>
                <SelectLabel>Blog posts</SelectLabel>
                <CmsSelectItems items={blogPosts} />
              </SelectGroup>
            )}
          </SelectContent>
        </Select>

        <div className="bg-muted/40 flex items-center gap-1 rounded-lg border p-0.5">
          {DEVICES.map(({ kind, label, Icon }) => (
            <Button
              key={kind}
              type="button"
              variant="ghost"
              size="icon"
              title={label}
              className={cn(
                "h-7 w-7",
                device === kind
                  ? "bg-muted text-foreground shadow-xs"
                  : "text-muted-foreground",
              )}
              aria-label={label}
              aria-pressed={device === kind}
              onClick={() => onDeviceChange(kind)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>

      {/* Right: status + actions */}
      <div className="flex flex-1 shrink-0 items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={notesOpen}
          onClick={onToggleNotes}
          className={cn("shrink-0", notesOpen && "bg-muted text-foreground")}
        >
          <MessageSquare className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Notes</span>
          {openNotesCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px] leading-none"
            >
              {openNotesCount}
            </Badge>
          )}
        </Button>

        <div
          role="status"
          aria-live="polite"
          className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex"
        >
          {saveFailed ? (
            <>
              <AlertCircle
                className="text-destructive h-3.5 w-3.5"
                aria-hidden="true"
              />
              <span
                className="text-destructive"
                title="Editing again will retry"
              >
                {statusLabel}
              </span>
            </>
          ) : flushPending ? (
            <>
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
              <span>{statusLabel}</span>
            </>
          ) : hasUnpublishedChanges ? (
            <>
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                aria-hidden="true"
              />
              <span className="text-amber-700 dark:text-amber-500">
                {statusLabel}
              </span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{statusLabel}</span>
            </>
          )}
        </div>

        {hasUnpublishedChanges && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPublishing}
            onClick={() => setDiscardOpen(true)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Discard
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          disabled={!hasUnpublishedChanges || isPublishing}
          onClick={onPublish}
        >
          {isPublishing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isPublishing ? "Publishing…" : "Publish"}
        </Button>
      </div>

      {/* Exit confirm — reachable while a flush or a publish/discard mutation is pending */}
      <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave the editor?</AlertDialogTitle>
            <AlertDialogDescription>
              A change is still saving to your draft. Leave now and the last
              edit may not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(exitHref)}>
              Leave anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard confirm */}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unpublished changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This reverts your draft back to the currently published content.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDiscard}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
