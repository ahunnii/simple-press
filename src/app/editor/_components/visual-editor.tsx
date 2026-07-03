"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { PreviewFrameHandle } from "~/components/preview/preview-frame";
import type { TemplateSection } from "~/lib/template-sections";
import { PREVIEW_COOKIE } from "~/lib/preview/preview-constants";
import { PAGE_PREVIEW_PATHS } from "~/lib/preview/preview-paths";
import { SP_META_KEY } from "~/lib/sp-meta";
import { groupFieldsByPage, PAGE_METADATA } from "~/lib/template-fields";
import { api } from "~/trpc/react";

import type { DeviceKind } from "./editor-preview";
import { DEVICE_WIDTHS, EditorPreview } from "./editor-preview";
import type { EditorTopBarPage } from "./editor-top-bar";
import { EditorTopBar } from "./editor-top-bar";
import { FieldPanel } from "./field-panel";
import { SectionRail } from "./section-rail";

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
  initialPage,
  initialSection,
}: VisualEditorProps) {
  // Selectable pages: page keys that have both template fields and a preview path.
  const pages: EditorTopBarPage[] = useMemo(() => {
    return Object.keys(groupFieldsByPage(templateId))
      .filter((key) => key in PAGE_PREVIEW_PATHS)
      .map((key) => ({ value: key, label: pageLabel(key) }));
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
  const [device, setDevice] = useState<DeviceKind>("desktop");
  const [isUpdating, setIsUpdating] = useState(false);

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

  const savePreviewDraft = api.content.savePreviewDraft.useMutation();

  const setFlushPendingState = useCallback((pending: boolean) => {
    flushPendingRef.current = pending;
    setFlushPending(pending);
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
    setIsUpdating(true);
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
      previewRef.current?.refresh();
      if (queuedRef.current) {
        // More edits arrived mid-flight — flush again with the newest values.
        queuedRef.current = false;
        void runFlush();
        return;
      }
      setFlushPendingState(false);
    } else if (retryCountRef.current < MAX_FLUSH_RETRIES) {
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
      // disabled during this window as well.
      if (mutationPendingRef.current) return;
      setFields((prev) => {
        const next = { ...prev, [key]: value };
        latestFieldsRef.current = next;
        return next;
      });
      scheduleFlush();
    },
    [scheduleFlush],
  );

  // ── Publish ──
  const publish = api.content.updateSiteContent.useMutation({
    onSuccess: (_data, variables) => {
      // Baseline from the PAYLOAD, not latestFieldsRef — the ref could in
      // principle drift after mutate() and the baseline must reflect what
      // the server actually published.
      setPublishedFields(
        (variables.customFields ?? {}) as Record<string, unknown>,
      );
      setServerHasDraft(false);
      setSaveFailed(false);
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
      mutationPendingRef.current = false;
    },
  });

  const handlePublish = useCallback(() => {
    if (mutationPendingRef.current) return; // double-click / overlap guard
    mutationPendingRef.current = true;
    void (async () => {
      cancelPendingFlush();
      // Let an already-sent draft write LAND before publishing — otherwise it
      // can re-create the server draft after updateSiteContent clears it.
      if (inFlightPromiseRef.current) await inFlightPromiseRef.current;
      setFlushPendingState(false);
      publish.mutate({ customFields: latestFieldsRef.current });
    })();
  }, [cancelPendingFlush, publish, setFlushPendingState]);

  // ── Discard ──
  const clearDraft = api.content.clearPreviewDraft.useMutation({
    onSuccess: () => {
      setFlushPendingState(false);
      setFields(publishedFields);
      latestFieldsRef.current = publishedFields;
      setServerHasDraft(false);
      setSaveFailed(false);
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
      mutationPendingRef.current = false;
    },
  });

  const handleDiscard = useCallback(() => {
    if (mutationPendingRef.current) return; // double-click / overlap guard
    mutationPendingRef.current = true;
    void (async () => {
      // Cancel synchronously so a scheduled flush can't fire mid-discard and
      // resurrect the edits, then let any already-sent write settle first.
      cancelPendingFlush();
      if (inFlightPromiseRef.current) await inFlightPromiseRef.current;
      clearDraft.mutate();
    })();
  }, [cancelPendingFlush, clearDraft]);

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

  // Hotspot click inside the iframe (sp:edit-group).
  const handleEditGroup = useCallback(
    (page: string, group: string) => {
      if (page !== activePage && page in PAGE_PREVIEW_PATHS) {
        setActivePage(page);
      }
      setActiveSectionId(group);
    },
    [activePage],
  );

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
        saveFailed={saveFailed}
        onPublish={handlePublish}
        onDiscard={handleDiscard}
      />

      <div className="flex min-h-0 flex-1">
        <SectionRail
          sections={sectionsForPage}
          globalSections={globalSections}
          activeSectionId={activeSectionId}
          onSelectSection={handleSelectSection}
        />

        <EditorPreview
          path={previewPath}
          width={DEVICE_WIDTHS[device]}
          isUpdating={isUpdating}
          onEditGroup={handleEditGroup}
          frameRef={previewRef}
        />

        {activeSection && (
          <FieldPanel
            section={activeSection}
            templateId={templateId}
            fields={fields}
            onFieldChange={applyFieldUpdate}
            embedsEnabled={embedsEnabled}
            disabled={isPublishing}
            onClose={() => setActiveSectionId(null)}
          />
        )}
      </div>
    </div>
  );
}
