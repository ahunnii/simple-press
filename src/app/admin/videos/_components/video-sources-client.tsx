"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Filter,
  ListChecks,
  ListVideo,
  Loader2,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { DayCode } from "~/lib/business-hours";
import type { PublishRules } from "~/lib/youtube/publish-rules";
import type { RouterOutputs } from "~/trpc/react";
import { DAY_CODES } from "~/lib/business-hours";
import { parseStoredPublishRules } from "~/lib/validators/videos";
import {
  DAY_CODE_LABELS,
  describePublishRules,
  emptyPublishRules,
  hasAnyRule,
  MAX_RULE_PHRASES,
  parsePhraseList,
} from "~/lib/youtube/publish-rules";
import { api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

import { AdminEmpty } from "../../_components/admin-empty";

type Source = RouterOutputs["videos"]["listSources"][number];

/** Preview counts from a dry-run `reapplyRules` call. */
type ReapplyPreview = {
  total: number;
  published: number;
  hidden: number;
  unchanged: number;
};

/** Full day names for `ToggleGroupItem`'s `aria-label`, keyed by `DayCode`. */
const DAY_CODE_FULL_NAMES: Record<DayCode, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

type Props = {
  sources: RouterOutputs["videos"]["listSources"];
};

export function VideoSourcesClient({ sources }: Props) {
  const utils = api.useUtils();
  const router = useRouter();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Source | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [rulesTarget, setRulesTarget] = useState<Source | null>(null);
  const [reapplyTarget, setReapplyTarget] = useState<Source | null>(null);
  const [reapplyPreview, setReapplyPreview] = useState<ReapplyPreview | null>(
    null,
  );
  const [reapplyingId, setReapplyingId] = useState<string | null>(null);

  const toggleMutation = api.videos.updateSource.useMutation({
    onSuccess: () => {
      void utils.videos.invalidate();
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to update");
      void utils.videos.invalidate();
    },
  });

  const syncMutation = api.videos.syncNow.useMutation({
    onSuccess: (data) => {
      toast.success(`Synced — ${data.added} added, ${data.updated} updated`);
    },
    onError: (err) => {
      toast.error(err.message ?? "Sync failed");
    },
    onSettled: () => {
      setSyncingId(null);
      void utils.videos.invalidate();
      router.refresh();
    },
  });

  const deleteMutation = api.videos.deleteSource.useMutation({
    onMutate: () => toast.loading("Removing..."),
    onSuccess: () => {
      toast.dismiss();
      toast.success(
        "Removed — its videos are still on your site as manual entries",
      );
      void utils.videos.invalidate();
      router.refresh();
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to remove");
    },
  });

  const handleSync = (source: Source) => {
    setSyncingId(source.id);
    syncMutation.mutate(source.id);
  };

  // No global onSuccess/onError here (unlike the mutations above) — this one
  // mutation drives two different flows (a silent dry-run preview and an
  // explicit confirmed run) that need different side effects, so each call
  // site below handles its own result via `mutateAsync`.
  const reapplyMutation = api.videos.reapplyRules.useMutation();

  const openReapply = (source: Source) => {
    setReapplyTarget(source);
    setReapplyPreview(null);
    reapplyMutation
      .mutateAsync({ sourceId: source.id, dryRun: true })
      .then(setReapplyPreview)
      .catch((err: unknown) => {
        toast.error(
          err instanceof Error ? err.message : "Couldn't preview rules",
        );
        setReapplyTarget(null);
      });
  };

  const handleReapplyConfirm = () => {
    if (!reapplyTarget) return;
    const source = reapplyTarget;
    setReapplyingId(source.id);
    reapplyMutation
      .mutateAsync({ sourceId: source.id, dryRun: false })
      .then((counts) => {
        toast.success(
          `Rules applied — ${counts.published} published, ${counts.hidden} moved to drafts, ${counts.unchanged} unchanged`,
        );
        void utils.videos.invalidate();
        router.refresh();
        setReapplyTarget(null);
      })
      .catch((err: unknown) => {
        toast.error(
          err instanceof Error ? err.message : "Couldn't apply rules",
        );
      })
      .finally(() => setReapplyingId(null));
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Channels &amp; Playlists</h1>
          <p>Connect YouTube feeds so new videos show up automatically</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Channel or Playlist
        </Button>
      </div>

      <Alert className="mb-4">
        <AlertTitle>Playlists vs. channels</AlertTitle>
        <AlertDescription>
          <p>
            A <strong>playlist</strong> works across accounts — you can add
            videos from other people&apos;s channels into your own playlist, and
            we&apos;ll follow that playlist. A <strong>channel</strong> pulls in
            everything that channel posts.
          </p>
          <p>
            Turn <strong>auto-publish off</strong> for a playlist you curate
            from other people&apos;s videos, so new finds land as drafts for you
            to review first. Turn it <strong>on</strong> for your own channel,
            where everything is fair game to show right away.
          </p>
          <p>
            Add <strong>publish rules</strong> to a channel that mixes your own
            shows with guest spots elsewhere — only videos matching the rules go
            live; everything else waits in Drafts marked &ldquo;Hidden by
            rule&rdquo;.
          </p>
        </AlertDescription>
      </Alert>

      {sources.length === 0 ? (
        <AdminEmpty
          icon={Radio}
          title="No channels or playlists yet"
          description="Connect one to pull in new videos automatically, or just add videos one at a time from the Videos page."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Source
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <SourceRow
              key={source.id}
              source={source}
              isSyncing={syncingId === source.id}
              isTogglePending={
                toggleMutation.isPending &&
                toggleMutation.variables?.id === source.id
              }
              onSync={() => handleSync(source)}
              onEdit={() => setEditing(source)}
              onDelete={() => setDeleteTarget(source)}
              onToggleEnabled={(enabled) =>
                toggleMutation.mutate({ id: source.id, enabled })
              }
              onToggleAutoPublish={(autoPublish) =>
                toggleMutation.mutate({ id: source.id, autoPublish })
              }
              onEditRules={() => setRulesTarget(source)}
              onReapplyRules={() => openReapply(source)}
              isReapplying={reapplyingId === source.id}
            />
          ))}
        </div>
      )}

      <SourceFormDialog open={addOpen} onOpenChange={setAddOpen} />
      <SourceFormDialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
        source={editing ?? undefined}
      />

      <PublishRulesDialog
        open={!!rulesTarget}
        onOpenChange={(open) => !open && setRulesTarget(null)}
        source={rulesTarget ?? undefined}
        onReapply={openReapply}
      />

      <AlertDialog
        open={!!reapplyTarget}
        onOpenChange={(open) => {
          if (!open) {
            setReapplyTarget(null);
            setReapplyPreview(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Re-apply rules to{" "}
              {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- see SourceRow's displayLabel comment */}
              {reapplyTarget?.label ||
                (reapplyTarget?.kind === "playlist"
                  ? "Untitled playlist"
                  : "Untitled channel")}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {!reapplyPreview
                ? "Counting…"
                : `${reapplyPreview.total} videos from this source will be checked against the rules: ${reapplyPreview.published} will be published, ${reapplyPreview.hidden} will move to Drafts, ${reapplyPreview.unchanged} stay as they are. Videos you added by hand are not affected.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reapplyingId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReapplyConfirm}
              disabled={!reapplyPreview || reapplyingId !== null}
            >
              {reapplyingId ? "Applying…" : "Re-apply"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {deleteTarget?.label ?? "this source"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This stops syncing new videos from this{" "}
              {deleteTarget?.kind ?? "source"}. It does <strong>not</strong>{" "}
              delete the videos it already added — they stay on your site as
              regular entries you can keep, edit, or remove individually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteMutation.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function SourceRow({
  source,
  isSyncing,
  isTogglePending,
  onSync,
  onEdit,
  onDelete,
  onToggleEnabled,
  onToggleAutoPublish,
  onEditRules,
  onReapplyRules,
  isReapplying,
}: {
  source: Source;
  isSyncing: boolean;
  isTogglePending: boolean;
  onSync: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onToggleAutoPublish: (autoPublish: boolean) => void;
  onEditRules: () => void;
  onReapplyRules: () => void;
  isReapplying: boolean;
}) {
  // `||`, not `??` — an owner-cleared label round-trips through the update
  // mutation as `""` (see SourceFormDialog), and `??` would let that falsy-
  // but-non-nullish empty string through instead of falling back.
  const fallbackLabel =
    source.kind === "playlist" ? "Untitled playlist" : "Untitled channel";
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- see comment above
  const displayLabel = source.label || fallbackLabel;
  const videoCount = source._count.videos;

  const stored = parseStoredPublishRules(source.publishRules);
  const summary = describePublishRules(
    stored.kind === "rules" ? stored.rules : null,
  );

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              {source.kind === "playlist" ? (
                <ListVideo className="h-4 w-4" />
              ) : (
                <Radio className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{displayLabel}</p>
                <Badge variant="outline" className="text-xs capitalize">
                  {source.kind}
                </Badge>
                {!source.enabled && (
                  <Badge variant="secondary" className="text-xs">
                    Disabled
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground truncate text-xs">
                {source.externalId} · {videoCount}{" "}
                {videoCount === 1 ? "video" : "videos"} ·{" "}
                {source.lastSyncedAt
                  ? `Synced ${formatDistanceToNow(new Date(source.lastSyncedAt), { addSuffix: true })}`
                  : "Never synced"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSync}
              disabled={isSyncing}
              aria-label={`Sync ${displayLabel} now`}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Sync now</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEditRules}
              aria-label={`Edit publish rules for ${displayLabel}`}
            >
              <Filter className="h-4 w-4" />
              <span className="ml-2 hidden sm:inline">Rules</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEdit}
              aria-label={`Edit ${displayLabel}`}
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive/80"
              aria-label={`Remove ${displayLabel}`}
              title="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {source.lastSyncError && (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Last sync failed</AlertTitle>
            <AlertDescription>{source.lastSyncError}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-6 border-t pt-3">
          <div className="flex items-center gap-2">
            <Switch
              id={`enabled-${source.id}`}
              checked={source.enabled}
              disabled={isTogglePending}
              onCheckedChange={onToggleEnabled}
              aria-label={`${source.enabled ? "Disable" : "Enable"} syncing for ${displayLabel}`}
            />
            <Label htmlFor={`enabled-${source.id}`} className="text-sm">
              Sync enabled
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id={`autopublish-${source.id}`}
              checked={source.autoPublish}
              disabled={isTogglePending}
              onCheckedChange={onToggleAutoPublish}
              aria-label={`${source.autoPublish ? "Turn off" : "Turn on"} auto-publish for ${displayLabel}`}
            />
            <Label htmlFor={`autopublish-${source.id}`} className="text-sm">
              Auto-publish new videos
            </Label>
          </div>

          <div className="flex basis-full items-center gap-3 sm:basis-auto">
            {stored.kind === "invalid" ? (
              <>
                <Badge variant="warning">Rules need re-saving</Badge>
                <p className="text-muted-foreground text-xs">
                  Open Rules and save again.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-xs">
                {summary
                  ? `Rules: ${summary}`
                  : "No publish rules — every new video follows Auto-publish."}
              </p>
            )}
            {summary && videoCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onReapplyRules}
                disabled={isReapplying}
              >
                {isReapplying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ListChecks className="h-4 w-4" />
                )}
                <span className="ml-2">Re-apply rules</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared add/edit dialog. In edit mode the URL/ID field is not shown — kind
 * and externalId are immutable after creation (`videoSourceUpdateSchema`
 * only accepts `label`, `enabled`, `autoPublish`), so re-parsing a URL here
 * would be misleading.
 */
function SourceFormDialog({
  open,
  onOpenChange,
  source,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: Source;
}) {
  const isEditing = !!source;
  const utils = api.useUtils();
  const router = useRouter();

  const [input, setInput] = useState("");
  const [label, setLabel] = useState(source?.label ?? "");
  const [autoPublish, setAutoPublish] = useState(source?.autoPublish ?? true);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setInput("");
    setLabel(source?.label ?? "");
    setAutoPublish(source?.autoPublish ?? true);
    setError(null);
  };

  // This dialog instance stays mounted (just hidden) between opens — the
  // parent toggles `open`/`source` rather than remounting — so the `useState`
  // initializers above only run once. Re-sync from `source` every time the
  // dialog opens, otherwise editing source A then closing and editing source
  // B would still show source A's stale label/autoPublish.
  useEffect(() => {
    if (open) {
      setInput("");
      setLabel(source?.label ?? "");
      setAutoPublish(source?.autoPublish ?? true);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source?.id]);

  const createMutation = api.videos.createSource.useMutation({
    onSuccess: () => {
      toast.success("Connected — the first sync runs shortly");
      void utils.videos.invalidate();
      router.refresh();
      reset();
      onOpenChange(false);
    },
    onError: (err) => {
      // Surfaced inline (not just a toast) — this is where the channel-handle
      // resolution failure lands, and it carries an actionable next step
      // ("get the ID from YouTube Studio…") that's easy to miss in a toast.
      setError(err.message || "Couldn't add that source — please try again.");
    },
  });

  const updateMutation = api.videos.updateSource.useMutation({
    onSuccess: () => {
      toast.success("Saved");
      void utils.videos.invalidate();
      router.refresh();
      onOpenChange(false);
    },
    onError: (err) => {
      setError(err.message || "Couldn't save changes — please try again.");
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    onOpenChange(next);
    if (!next) reset();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isEditing && source) {
      // Always sent (never `undefined`) so clearing the field back to blank
      // actually clears the stored label rather than leaving the old value
      // in place — `videoSourceUpdateSchema.label` is `.optional()` (no
      // `.nullable()`), so an omitted/undefined key means "leave unchanged"
      // to Prisma, and there is no other way to express "clear it" through
      // this schema. `SourceRow`'s `displayLabel` falls back with `||`
      // specifically to treat this "" the same as no label.
      updateMutation.mutate({
        id: source.id,
        label: label.trim(),
        autoPublish,
      });
      return;
    }

    if (!input.trim()) {
      setError("Paste a YouTube channel or playlist link first.");
      return;
    }

    createMutation.mutate({
      input: input.trim(),
      label: label.trim(),
      autoPublish,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit source" : "Add a channel or playlist"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the display name or auto-publish setting."
                : "Paste a channel URL, a playlist URL, a @handle, or a bare channel/playlist ID."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isEditing && source ? (
              <div className="space-y-1.5">
                <Label>Source</Label>
                <p className="bg-muted rounded-md border px-3 py-2 text-sm capitalize">
                  {source.kind}: {source.externalId}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="source-input">Channel or playlist URL</Label>
                <Input
                  id="source-input"
                  placeholder="https://www.youtube.com/@yourhandle or a playlist link"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isPending}
                  autoFocus
                  aria-invalid={!!error}
                  aria-describedby={error ? "source-input-error" : undefined}
                />
                <p className="text-muted-foreground text-xs">
                  Playlist IDs are visible right in the playlist URL. Channel
                  IDs aren&apos;t — if pasting a @handle doesn&apos;t work, find
                  the channel ID in YouTube Studio → Settings → Channel →
                  Advanced.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="source-label">Display name (optional)</Label>
              <Input
                id="source-label"
                placeholder="e.g. Our channel, or Featured makers"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="source-autopublish">
                  Auto-publish new videos
                </Label>
                <p className="text-muted-foreground text-xs">
                  On for your own channel. Off for a playlist curating other
                  people&apos;s videos — new finds land as drafts to review.
                </p>
              </div>
              <Switch
                id="source-autopublish"
                checked={autoPublish}
                onCheckedChange={setAutoPublish}
                disabled={isPending}
              />
            </div>

            {error && (
              <p
                id="source-input-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving…"
                : isEditing
                  ? "Save changes"
                  : "Add source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Edits a source's `publishRules`. Text fields hold raw comma-separated
 * strings (not string[]) while open, same as `SourceFormDialog` holds plain
 * strings for its inputs — parsing into `parsePhraseList` output only happens
 * on save, so the owner can type a trailing comma or extra whitespace without
 * it being silently rewritten out from under their cursor.
 */
function PublishRulesDialog({
  open,
  onOpenChange,
  source,
  onReapply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: Source;
  onReapply: (source: Source) => void;
}) {
  const utils = api.useUtils();
  const router = useRouter();

  const [titleInclude, setTitleInclude] = useState("");
  const [titleExclude, setTitleExclude] = useState("");
  const [weekdays, setWeekdays] = useState<DayCode[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Same re-seed pattern as `SourceFormDialog`: this dialog instance stays
  // mounted between opens, so re-sync from `source` every time it opens
  // rather than only on mount — otherwise editing source A's rules then
  // opening source B would still show A's stale fields.
  useEffect(() => {
    if (open) {
      const stored = parseStoredPublishRules(source?.publishRules);
      const rules = stored.kind === "rules" ? stored.rules : null;
      setTitleInclude(rules?.titleInclude.join(", ") ?? "");
      setTitleExclude(rules?.titleExclude.join(", ") ?? "");
      setWeekdays(rules?.weekdays ?? []);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source?.id]);

  const updateMutation = api.videos.updateSource.useMutation({
    onError: (err) => {
      setError(err.message || "Couldn't save changes — please try again.");
    },
  });

  const isPending = updateMutation.isPending;
  const includePhrases = parsePhraseList(titleInclude);
  const excludePhrases = parsePhraseList(titleExclude);
  const tooManyPhrases =
    includePhrases.length > MAX_RULE_PHRASES ||
    excludePhrases.length > MAX_RULE_PHRASES;
  // "Clear rules" only makes sense when there is something stored to clear.
  const hadStoredRules =
    parseStoredPublishRules(source?.publishRules).kind === "rules";

  const handleOpenChange = (next: boolean) => {
    if (isPending) return;
    onOpenChange(next);
  };

  const handleSave = () => {
    if (!source) return;
    setError(null);

    if (tooManyPhrases) {
      setError(`At most ${MAX_RULE_PHRASES} phrases per field.`);
      return;
    }

    const rules: PublishRules = {
      ...emptyPublishRules(),
      titleInclude: includePhrases,
      titleExclude: excludePhrases,
      weekdays,
    };

    updateMutation.mutate(
      { id: source.id, publishRules: rules },
      {
        onSuccess: () => {
          void utils.videos.invalidate();
          router.refresh();
          onOpenChange(false);
          const count = source._count.videos;
          toast.success(
            "Rules saved",
            count > 0 && hasAnyRule(rules)
              ? {
                  action: {
                    label: `Re-apply to ${count} videos`,
                    onClick: () => onReapply(source),
                  },
                }
              : undefined,
          );
        },
      },
    );
  };

  const handleClear = () => {
    if (!source) return;
    setError(null);

    updateMutation.mutate(
      { id: source.id, publishRules: null },
      {
        onSuccess: () => {
          toast.success("Rules cleared");
          void utils.videos.invalidate();
          router.refresh();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish rules</DialogTitle>
          <DialogDescription>
            Only videos matching every rule below are auto-published from this
            source; the rest land as drafts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="rules-title-include">
              Title must contain any of
            </Label>
            <Input
              id="rules-title-include"
              placeholder="Bamboo Hour, Studio Session"
              value={titleInclude}
              onChange={(e) => {
                setTitleInclude(e.target.value);
                if (error) setError(null);
              }}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">
              Separate phrases with commas. Not case-sensitive. Matched against
              the YouTube title, not your custom title.
            </p>
            {includePhrases.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {includePhrases.map((phrase) => (
                  <Badge key={phrase} variant="secondary">
                    {phrase}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rules-title-exclude">
              Title must not contain any of
            </Label>
            <Input
              id="rules-title-exclude"
              placeholder="Trailer, Guest on"
              value={titleExclude}
              onChange={(e) => {
                setTitleExclude(e.target.value);
                if (error) setError(null);
              }}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">
              Separate phrases with commas. Not case-sensitive. Matched against
              the YouTube title, not your custom title.
            </p>
            {excludePhrases.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {excludePhrases.map((phrase) => (
                  <Badge key={phrase} variant="secondary">
                    {phrase}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Only videos published on</Label>
            <ToggleGroup
              type="multiple"
              variant="outline"
              value={weekdays}
              onValueChange={(v) => setWeekdays(v as DayCode[])}
              disabled={isPending}
            >
              {DAY_CODES.map((code) => (
                <ToggleGroupItem
                  key={code}
                  value={code}
                  aria-label={DAY_CODE_FULL_NAMES[code]}
                >
                  {DAY_CODE_LABELS[code]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-muted-foreground text-xs">
              Counted in your store&apos;s time zone (Settings → General). Leave
              every day off to allow any day.
            </p>
          </div>

          <p className="text-muted-foreground text-xs">
            All rules must match. Videos that don&apos;t match are still saved
            as drafts marked &ldquo;Hidden by rule&rdquo;, so you can publish
            them by hand.
          </p>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          {hadStoredRules && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              disabled={isPending}
            >
              Clear rules
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || tooManyPhrases}
          >
            {isPending ? "Saving…" : "Save rules"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
