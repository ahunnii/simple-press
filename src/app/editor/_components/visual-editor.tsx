"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { PreviewFrameHandle } from "~/components/preview/preview-frame";
import type { TemplateSection } from "~/lib/template-sections";
import { PREVIEW_COOKIE } from "~/lib/preview/preview-constants";
import { PAGE_PREVIEW_PATHS } from "~/lib/preview/preview-paths";
import { PREVIEW_SOURCE } from "~/lib/preview/use-preview-bridge";
import {
  getSpMeta,
  getThemeSelection,
  setSectionHidden,
  setThemeSelection,
  SP_META_KEY,
} from "~/lib/sp-meta";
import { getTemplateTheme } from "~/lib/template-themes";
import { groupFieldsByPage, PAGE_METADATA } from "~/lib/template-fields";
import { api } from "~/trpc/react";

import type { DeviceKind } from "./editor-preview";
import { DEVICE_WIDTHS, EditorPreview } from "./editor-preview";
import type { EditorTopBarPage } from "./editor-top-bar";
import { EditorTopBar } from "./editor-top-bar";
import { FieldPanel } from "./field-panel";
import { SectionRail } from "./section-rail";
import { ThemePanel } from "./theme-panel";

const FLUSH_DEBOUNCE_MS = 800;
const FLUSH_RETRY_MS = 5000;
const MAX_FLUSH_RETRIES = 3;

export type VisualEditorProps = {
  businessId: string;
  businessName: string;
  templateId: string;
  /** Currently published field values (the dirty-comparison baseline). */
  customFields: Record<string, unknown>;
  /** Durable preview draft, or null. When present the editor resumes it. */
  previewCustomFields: Record<string, unknown> | null;
  /** Whether a durable draft exists on the server. */
  hasDraft: boolean;
  /** All sections for the active template (all pages, template order). */
  sections: TemplateSection[];
  embedsEnabled: boolean;
  mediaEnabled: boolean;
  /** Deep-link initial page (defaults to "homepage"). */
  initialPage: string;
  /** Deep-link initial section id, or null. */
  initialSection: string | null;
  /** True for PLATFORM_ADMIN users — surfaces the advanced editor link. */
  isPlatformAdmin: boolean;
};

// ── Pure helpers ──────────────────────────────────────────────────────────

/** Stable stringify (sorted keys at every level) for order-insensitive compare. */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val: unknown) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      const record = val as Record<string, unknown>;
      return Object.keys(record)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = record[key];
          return acc;
        }, {});
    }
    return val;
  });
}

/** Strip the reserved `_sp` editor-metadata namespace before comparing. */
function withoutSpMeta(fields: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...fields };
  delete rest[SP_META_KEY];
  return rest;
}

/**
 * Merge a publish `draft` over the current `live` customFields, changing only
 * the keys the draft actually touched relative to its `base` (the values the
 * draft diverged from — i.e. what was last published locally).
 *
 * Publishing must NOT replace the whole customFields object with the draft
 * snapshot: any keys written to the live record since the draft was opened
 * (e.g. Branding / Navigation saved via `updateSiteContent` while the draft
 * stayed alive) are absent from the snapshot and would be clobbered. Starting
 * from `live` and applying only the draft's real changes (adds / edits /
 * removals — including the reserved `_sp` metadata key, which is just another
 * key here) preserves those concurrent writes.
 */
function mergeDraftOverLive(
  live: Record<string, unknown>,
  draft: Record<string, unknown>,
  base: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...live };
  const keys = new Set<string>([...Object.keys(draft), ...Object.keys(base)]);
  for (const key of keys) {
    const inDraft = Object.prototype.hasOwnProperty.call(draft, key);
    const inBase = Object.prototype.hasOwnProperty.call(base, key);
    if (inDraft && !inBase) {
      // Draft introduced this key — always apply it.
      result[key] = draft[key];
    } else if (!inDraft && inBase) {
      // Draft removed a key that existed at draft-open — remove it.
      delete result[key];
    } else if (inDraft && inBase) {
      // Present in both: apply the draft value only if the owner changed it,
      // so keys the draft left untouched keep whatever the LIVE record holds.
      if (stableStringify(draft[key]) !== stableStringify(base[key])) {
        result[key] = draft[key];
      }
    }
  }
  return result;
}

function humanize(key: string): string {
  return key.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function pageLabel(pageKey: string): string {
  const meta = PAGE_METADATA[pageKey as keyof typeof PAGE_METADATA];
  return meta?.title ?? humanize(pageKey);
}

// ── Component ─────────────────────────────────────────────────────────────

/**
 * Architectural core of the visual editor. Owns field state, the durable draft
 * lifecycle (debounced + coalesced flushes), publish/discard, dirty tracking,
 * and navigation between pages/sections. Presentational children are dumb.
 */
export function VisualEditor({
  businessId,
  businessName,
  templateId,
  customFields,
  previewCustomFields,
  hasDraft,
  sections,
  embedsEnabled,
  mediaEnabled,
  initialPage,
  initialSection,
  isPlatformAdmin,
}: VisualEditorProps) {
  // Selectable pages: page keys that have both template fields and a preview path.
  const pages: EditorTopBarPage[] = useMemo(() => {
    return Object.keys(groupFieldsByPage(templateId))
      .filter((key) => key in PAGE_PREVIEW_PATHS)
      .map((key) => ({ value: key, label: pageLabel(key) }));
  }, [templateId]);

  // Field type lookup — text/textarea fields get the live-patch fast path.
  const fieldTypeByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const fields of Object.values(groupFieldsByPage(templateId))) {
      for (const field of fields) map.set(field.key, field.type);
    }
    return map;
  }, [templateId]);

  const defaultPage = pages[0]?.value ?? "homepage";
  // Deep-link guard: if ?section= names a section on a different page than
  // ?page=, honor the SECTION's page so the panel never opens disconnected
  // from the visible preview. Unknown section ids — and sections on pages
  // with no preview path (e.g. "services", "cart") — are dropped, since
  // opening them would show a panel the preview can't display.
  const deepLinkedSection = initialSection
    ? (sections.find((s) => s.id === initialSection) ?? null)
    : null;
  const initialSectionObj =
    deepLinkedSection &&
    (deepLinkedSection.page === "global" ||
      deepLinkedSection.page in PAGE_PREVIEW_PATHS)
      ? deepLinkedSection
      : null;
  const clampedInitialPage =
    initialSectionObj &&
    initialSectionObj.page !== "global" &&
    initialSectionObj.page in PAGE_PREVIEW_PATHS
      ? initialSectionObj.page
      : initialPage in PAGE_PREVIEW_PATHS
        ? initialPage
        : defaultPage;

  // ── State ──
  const [publishedFields, setPublishedFields] =
    useState<Record<string, unknown>>(customFields);
  const [fields, setFields] = useState<Record<string, unknown>>(
    () => previewCustomFields ?? customFields,
  );
  const [serverHasDraft, setServerHasDraft] = useState(hasDraft);
  const [activePage, setActivePage] = useState(clampedInitialPage);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    initialSectionObj?.id ?? null,
  );
  const [themeOpen, setThemeOpen] = useState(false);
  const [device, setDevice] = useState<DeviceKind>("desktop");
  const [isUpdating, setIsUpdating] = useState(false);
  /**
   * State mirror of `mutationPendingRef` so the field/theme panels can be
   * visually disabled for the WHOLE publish/discard settling window — not just
   * the mutation's own in-flight phase (`isPublishing`), which excludes the
   * pre-mutation `await inFlightPromiseRef` gap where edits were being silently
   * dropped.
   */
  const [mutationPending, setMutationPending] = useState(false);

  // ── Refs ──
  const previewRef = useRef<PreviewFrameHandle>(null);
  const latestFieldsRef = useRef(fields);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  /** Settles when the current in-flight draft write finishes (never rejects). */
  const inFlightPromiseRef = useRef<Promise<void> | null>(null);
  const queuedRef = useRef(false);
  /**
   * Monotonic token. Publish/discard bump it to invalidate any scheduled or
   * in-flight flush: a completion whose epoch is stale must not touch state
   * (the publish/discard mutation owns the server draft from that point on).
   */
  const flushEpochRef = useRef(0);
  /** True while any edit is unflushed OR a flush is scheduled/in-flight. */
  const flushPendingRef = useRef(false);
  const [flushPending, setFlushPending] = useState(false);
  /**
   * True from the moment publish/discard is clicked until its mutation
   * settles. Freezes field edits (they would race the mutation) and guards
   * against double-click / publish-then-discard response inversion.
   */
  const mutationPendingRef = useRef(false);
  /** Consecutive failed flush attempts; reset on success or new edit. */
  const retryCountRef = useRef(0);
  /** True once the retry budget is exhausted — surfaced in the status chip. */
  const [saveFailed, setSaveFailed] = useState(false);
  /**
   * True when the next flush must refresh the iframe: a non-patchable field
   * changed, a patch couldn't be delivered, or the iframe reported a key it
   * has no annotation for. Successfully patched text edits skip the reload.
   */
  const refreshNeededRef = useRef(false);
  /** Patch keys sent but not yet acked — treated as refresh-needed at flush. */
  const unackedPatchKeysRef = useRef<Set<string>>(new Set());

  const savePreviewDraft = api.content.savePreviewDraft.useMutation();
  const utils = api.useUtils();

  // Keep the ref mirror in sync with the `fields` state. This is the single
  // place that writes `latestFieldsRef` in response to a state change — state
  // updater functions themselves must stay pure and must not reach outside
  // to mutate a ref, so callers below only ever `return next` from their
  // updater and let this effect do the mirroring.
  useEffect(() => {
    latestFieldsRef.current = fields;
  }, [fields]);

  const setFlushPendingState = useCallback((pending: boolean) => {
    flushPendingRef.current = pending;
    setFlushPending(pending);
  }, []);

  const setMutationPendingState = useCallback((pending: boolean) => {
    mutationPendingRef.current = pending;
    setMutationPending(pending);
  }, []);

  /**
   * A field/visibility/theme edit was attempted while publish or discard is
   * settling. Freezing here prevents a silent race (the edit would be reset by
   * discard, or flushed as a phantom draft right after publish cleared it) —
   * but it must not be silent. Give the owner explicit feedback (deduped by a
   * stable toast id so a burst of blocked edits shows a single message).
   */
  const notifyEditBlocked = useCallback(() => {
    toast.info("Finishing your last action — one moment…", {
      id: "sp-mutation-settling",
    });
  }, []);

  /**
   * Cancel every pending/scheduled flush and invalidate in-flight completions.
   * Callers that still need the in-flight WRITE to settle server-side (publish,
   * discard) must additionally await `inFlightPromiseRef.current`.
   */
  const cancelPendingFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    queuedRef.current = false;
    flushEpochRef.current += 1;
  }, []);

  // ── Draft flush (debounced + coalesced + epoch-guarded) ──
  const runFlush = useCallback(async () => {
    // Coalesce: if a flush is already running, mark exactly one follow-up.
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }
    const epoch = flushEpochRef.current;
    inFlightRef.current = true;
    // Shimmer only when this flush will reload the iframe — successfully
    // patched text edits should feel instant, with no overlay flash.
    setIsUpdating(
      refreshNeededRef.current || unackedPatchKeysRef.current.size > 0,
    );
    let ok = false;
    const attempt = savePreviewDraft
      .mutateAsync({ customFields: latestFieldsRef.current })
      .then(() => {
        ok = true;
      })
      .catch(() => {
        ok = false;
      });
    inFlightPromiseRef.current = attempt;
    await attempt;
    inFlightRef.current = false;
    inFlightPromiseRef.current = null;
    setIsUpdating(false);

    // Superseded by publish/discard while in flight — they own state now.
    if (flushEpochRef.current !== epoch) {
      queuedRef.current = false;
      return;
    }

    if (ok) {
      retryCountRef.current = 0;
      setSaveFailed(false);
      setServerHasDraft(true);
      // Only reload the iframe when something wasn't (or couldn't be) live-
      // patched. Pure text edits that were acked keep the patched DOM as-is —
      // the server draft now matches it, so no reload is needed.
      const needsRefresh =
        refreshNeededRef.current || unackedPatchKeysRef.current.size > 0;
      refreshNeededRef.current = false;
      unackedPatchKeysRef.current.clear();
      if (needsRefresh) previewRef.current?.refresh();
      if (queuedRef.current) {
        // More edits arrived mid-flight — flush again with the newest values.
        queuedRef.current = false;
        void runFlush();
        return;
      }
      setFlushPendingState(false);
    } else if (retryCountRef.current < MAX_FLUSH_RETRIES) {
      // The retry below re-reads `latestFieldsRef.current` (always current),
      // so any edit that arrived mid-flight is already covered by the retry —
      // clear the coalescing flag or the eventual successful flush will see
      // it still set and fire one redundant extra flush after that.
      queuedRef.current = false;
      // Keep flushPending ARMED so beforeunload/Exit still warn about the
      // unsaved edit, and auto-retry — "retry on next edit" is not enough
      // when the user stops editing.
      retryCountRef.current += 1;
      toast.error("Couldn't save your changes — retrying…");
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        void runFlush();
      }, FLUSH_RETRY_MS);
    } else {
      // Retry budget exhausted: stop hammering the server, but keep the exit
      // warnings armed. The next edit resets the budget and tries again.
      queuedRef.current = false;
      setSaveFailed(true);
      toast.error(
        "Your latest changes couldn't be saved. Check your connection — editing again will retry.",
        { duration: 10000 },
      );
    }
  }, [savePreviewDraft, setFlushPendingState]);

  const scheduleFlush = useCallback(() => {
    retryCountRef.current = 0;
    setSaveFailed(false);
    setFlushPendingState(true);
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      void runFlush();
    }, FLUSH_DEBOUNCE_MS);
  }, [runFlush, setFlushPendingState]);

  /**
   * Single funnel for every field mutation. A Phase 2 live-patch fast path can
   * be added here (post `sp:patch-fields`) without rewiring any callers.
   */
  const applyFieldUpdate = useCallback(
    (key: string, value: unknown) => {
      // Never surface the reserved editor-metadata namespace as a field.
      if (key === SP_META_KEY) return;
      // Frozen while publish/discard is settling — an edit here would race
      // the mutation and either be lost (discard reset) or flushed as a
      // phantom draft right after publish cleared it. The panel is visually
      // disabled during this window as well; the toast covers any edit that
      // still slips through (e.g. keyboard) so the drop is never silent.
      if (mutationPendingRef.current) {
        notifyEditBlocked();
        return;
      }
      // Pure updater — `latestFieldsRef` is kept in sync by the `fields`
      // effect above, not mutated here (state updaters must stay pure; React
      // may invoke them more than once per commit in strict/concurrent mode).
      setFields((prev) => ({ ...prev, [key]: value }));

      // Live-patch fast path: text/textarea edits are pushed straight into
      // the iframe DOM. Everything else reloads the preview on next flush.
      const type = fieldTypeByKey.get(key);
      if ((type === "text" || type === "textarea") && typeof value === "string") {
        const sent = previewRef.current?.postMessage({
          source: PREVIEW_SOURCE,
          type: "sp:patch-fields",
          fields: { [key]: value },
        });
        if (sent) unackedPatchKeysRef.current.add(key);
        else refreshNeededRef.current = true;
      } else {
        refreshNeededRef.current = true;
      }

      scheduleFlush();
    },
    [scheduleFlush, fieldTypeByKey, notifyEditBlocked],
  );

  // ── Publish ──
  const publish = api.content.updateSiteContent.useMutation({
    onSuccess: (_data, variables) => {
      // Baseline from the PAYLOAD, not latestFieldsRef — the ref could in
      // principle drift after mutate() and the baseline must reflect what
      // the server actually published. The payload is the merged object
      // (draft applied over the live record), so it may carry keys the draft
      // snapshot never had (e.g. Branding/Nav saved while the draft was open).
      const published = (variables.customFields ?? {}) as Record<
        string,
        unknown
      >;
      setPublishedFields(published);
      // Sync the working set to what was actually published so `localDiffers`
      // doesn't immediately flag the concurrently-merged keys as "unpublished".
      setFields(published);
      latestFieldsRef.current = published;
      setServerHasDraft(false);
      setSaveFailed(false);
      refreshNeededRef.current = false;
      unackedPatchKeysRef.current.clear();
      toast.success("Your changes are live");
      previewRef.current?.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to publish");
      // The flush was cancelled before publishing; the edits only live
      // locally now, so re-arm the draft flush to keep them durable.
      scheduleFlush();
    },
    onSettled: () => {
      setMutationPendingState(false);
    },
  });

  const handlePublish = useCallback(() => {
    if (mutationPendingRef.current) return; // double-click / overlap guard
    setMutationPendingState(true);
    void (async () => {
      cancelPendingFlush();
      // Let an already-sent draft write LAND before publishing — otherwise it
      // can re-create the server draft after updateSiteContent clears it.
      if (inFlightPromiseRef.current) await inFlightPromiseRef.current;
      setFlushPendingState(false);

      // MERGE the draft over the CURRENT live customFields rather than
      // replacing the whole object with the draft snapshot. Re-read the live
      // record now so any keys written since the draft opened (Branding,
      // Navigation, etc.) survive publish. Fall back to the raw snapshot if
      // the read fails — that preserves the pre-existing publish behavior
      // rather than blocking the owner from going live.
      const draftSnapshot = latestFieldsRef.current;
      let payload = draftSnapshot;
      try {
        const live = await utils.content.getEditorState.fetch();
        payload = mergeDraftOverLive(
          live.customFields ?? {},
          draftSnapshot,
          publishedFields,
        );
      } catch {
        payload = draftSnapshot;
      }

      publish.mutate({
        customFields: payload,
        clearPreviewDraft: true,
      });
    })();
  }, [
    cancelPendingFlush,
    publish,
    setFlushPendingState,
    setMutationPendingState,
    utils,
    publishedFields,
  ]);

  // ── Discard ──
  const clearDraft = api.content.clearPreviewDraft.useMutation({
    onSuccess: () => {
      setFlushPendingState(false);
      setFields(publishedFields);
      latestFieldsRef.current = publishedFields;
      setServerHasDraft(false);
      setSaveFailed(false);
      refreshNeededRef.current = false;
      unackedPatchKeysRef.current.clear();
      toast.success("Draft discarded");
      previewRef.current?.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to discard");
      // The pending flush was cancelled but the local edits still exist and
      // flushPending may still be armed — re-arm a real save so the editor
      // can't wedge in a permanent "Saving…" state with no timer running.
      if (flushPendingRef.current) scheduleFlush();
    },
    onSettled: () => {
      setMutationPendingState(false);
    },
  });

  const handleDiscard = useCallback(() => {
    if (mutationPendingRef.current) return; // double-click / overlap guard
    setMutationPendingState(true);
    void (async () => {
      // Cancel synchronously so a scheduled flush can't fire mid-discard and
      // resurrect the edits, then let any already-sent write settle first.
      cancelPendingFlush();
      if (inFlightPromiseRef.current) await inFlightPromiseRef.current;
      clearDraft.mutate();
    })();
  }, [cancelPendingFlush, clearDraft, setMutationPendingState]);

  // ── Dirty model ──
  const localDiffers = useMemo(
    () =>
      stableStringify(withoutSpMeta(fields)) !==
      stableStringify(withoutSpMeta(publishedFields)),
    [fields, publishedFields],
  );
  const hasUnpublishedChanges = serverHasDraft || localDiffers;

  // ── Preview cookie lifecycle ──
  // Set on mount, cleared on unmount + pagehide. The DRAFT is durable, so it is
  // intentionally NOT cleared here (unlike the legacy template-fields editor).
  useEffect(() => {
    document.cookie = `${PREVIEW_COOKIE}=${businessId}; path=/; SameSite=Lax`;
    return () => {
      document.cookie = `${PREVIEW_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
    };
  }, [businessId]);

  useEffect(() => {
    const onPageHide = () => {
      document.cookie = `${PREVIEW_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  // Warn before unload ONLY while a flush is pending/in-flight — once flushed,
  // the draft is durable and no warning is needed.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (
        flushPendingRef.current ||
        inFlightRef.current ||
        // Publish/discard in flight: closing now could lose the newest edits
        // (their flush was cancelled in favor of the mutation).
        mutationPendingRef.current
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Unmount: stop the flush/retry timers. Without this, an SPA navigation
  // away (e.g. Exit → /admin/content) leaves a failing flush retrying —
  // and toasting — forever on pages that have no editor.
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // ── Navigation ──
  const sectionsForPage = useMemo(
    () => sections.filter((s) => s.page === activePage),
    [sections, activePage],
  );
  const globalSections = useMemo(
    () => sections.filter((s) => s.page === "global"),
    [sections],
  );
  const activeSection = useMemo(
    () => sections.find((s) => s.id === activeSectionId) ?? null,
    [sections, activeSectionId],
  );

  const previewPath = PAGE_PREVIEW_PATHS[activePage] ?? "/";

  const handleSelectSection = useCallback(
    (section: TemplateSection) => {
      setThemeOpen(false);
      setActiveSectionId(section.id);
      // focusGroup expects the BARE group name — the overlay rebuilds the
      // full data-sp-group value as `${page}.${group}` (see preview-overlay).
      const bareGroup = section.id.startsWith(`${section.page}.`)
        ? section.id.slice(section.page.length + 1)
        : section.id;
      previewRef.current?.focusGroup(section.page, bareGroup);
    },
    [],
  );

  const handlePageChange = useCallback((page: string) => {
    setActivePage(page);
    // Close the panel — the previously open section belongs to another page.
    setActiveSectionId(null);
  }, []);

  // ── Section visibility ──
  const hiddenSectionIds = useMemo(() => {
    const meta = getSpMeta(fields);
    const hidden = new Set<string>();
    for (const s of sections) {
      if (meta.sections?.[s.id]?.hidden ?? s.defaultHidden ?? false) {
        hidden.add(s.id);
      }
    }
    return hidden;
  }, [fields, sections]);

  const handleToggleVisibility = useCallback(
    (section: TemplateSection) => {
      // The section rail's eye toggle has no disabled state of its own, so
      // this is the settling-window guard for visibility edits. Give feedback
      // instead of dropping the toggle silently.
      if (mutationPendingRef.current) {
        notifyEditBlocked();
        return;
      }
      // Pure updater — see the `fields` effect above for the `latestFieldsRef`
      // mirror.
      setFields((prev) => {
        const meta = getSpMeta(prev);
        const currentlyHidden =
          meta.sections?.[section.id]?.hidden ?? section.defaultHidden ?? false;
        return setSectionHidden(prev, section.id, !currentlyHidden);
      });
      // Visibility renders server-side — always needs an iframe reload.
      refreshNeededRef.current = true;
      scheduleFlush();
    },
    [scheduleFlush, notifyEditBlocked],
  );

  // ── Theme ──
  const templateTheme = useMemo(
    () => getTemplateTheme(templateId),
    [templateId],
  );
  const themeSelection = useMemo(() => getThemeSelection(fields), [fields]);

  const handleThemeSelect = useCallback(
    (kind: "palette" | "fonts", presetId: string | undefined) => {
      if (mutationPendingRef.current) {
        notifyEditBlocked();
        return;
      }
      // Pure updater — see the `fields` effect above for the `latestFieldsRef`
      // mirror.
      setFields((prev) => setThemeSelection(prev, kind, presetId));
      // Theme vars render server-side on the template root — needs a reload.
      refreshNeededRef.current = true;
      scheduleFlush();
    },
    [scheduleFlush, notifyEditBlocked],
  );

  // Patch ack from the iframe (sp:patched).
  const handlePatched = useCallback((applied: string[], missed: string[]) => {
    for (const key of applied) unackedPatchKeysRef.current.delete(key);
    for (const key of missed) {
      unackedPatchKeysRef.current.delete(key);
      // No annotated element for this key — fall back to reload on flush.
      refreshNeededRef.current = true;
    }
  }, []);

  // Hotspot click inside the iframe (sp:edit-group).
  const handleEditGroup = useCallback(
    (page: string, group: string) => {
      if (page !== activePage && page in PAGE_PREVIEW_PATHS) {
        setActivePage(page);
      }
      setThemeOpen(false);
      setActiveSectionId(group);
    },
    [activePage],
  );

  const handleSelectTheme = useCallback(() => {
    setActiveSectionId(null);
    setThemeOpen(true);
  }, []);

  const isPublishing = publish.isPending || clearDraft.isPending;

  return (
    <div className="flex h-full flex-col">
      <EditorTopBar
        businessName={businessName}
        templateId={templateId}
        pages={pages}
        activePage={activePage}
        onPageChange={handlePageChange}
        device={device}
        onDeviceChange={setDevice}
        hasUnpublishedChanges={hasUnpublishedChanges}
        isPublishing={isPublishing}
        flushPending={flushPending}
        mutationPending={mutationPending}
        saveFailed={saveFailed}
        onPublish={handlePublish}
        onDiscard={handleDiscard}
      />

      <div className="flex min-h-0 flex-1">
        <SectionRail
          sections={sectionsForPage}
          globalSections={globalSections}
          activeSectionId={activeSectionId}
          hiddenSectionIds={hiddenSectionIds}
          onSelectSection={handleSelectSection}
          onToggleVisibility={handleToggleVisibility}
          hasTheme={templateTheme !== null}
          themeActive={themeOpen}
          onSelectTheme={handleSelectTheme}
          isPlatformAdmin={isPlatformAdmin}
        />

        <EditorPreview
          path={previewPath}
          width={DEVICE_WIDTHS[device]}
          isUpdating={isUpdating}
          onEditGroup={handleEditGroup}
          onPatched={handlePatched}
          frameRef={previewRef}
        />

        {themeOpen && templateTheme && (
          <ThemePanel
            theme={templateTheme}
            selection={themeSelection}
            onSelect={handleThemeSelect}
            disabled={isPublishing || mutationPending}
            onClose={() => setThemeOpen(false)}
          />
        )}

        {!themeOpen && activeSection && (
          <FieldPanel
            section={activeSection}
            templateId={templateId}
            fields={fields}
            publishedFields={publishedFields}
            onFieldChange={applyFieldUpdate}
            embedsEnabled={embedsEnabled}
            mediaEnabled={mediaEnabled}
            disabled={isPublishing || mutationPending}
            onClose={() => setActiveSectionId(null)}
          />
        )}
      </div>
    </div>
  );
}
