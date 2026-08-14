"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { CmsPageDraftValues } from "./cms-page-panel";
import type { DeviceKind } from "./editor-preview";
import type { EditorTopBarCmsPage, EditorTopBarPage } from "./editor-top-bar";
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
import { groupFieldsByPage, PAGE_METADATA } from "~/lib/template-fields";
import { isBlogPostContextSection } from "~/lib/template-sections";
import { getTemplateTheme } from "~/lib/template-themes";
import { api } from "~/trpc/react";

import { CmsPagePanel } from "./cms-page-panel";
import { CmsPageRail } from "./cms-page-rail";
import { DEVICE_WIDTHS, EditorPreview } from "./editor-preview";
import { EditorTopBar } from "./editor-top-bar";
import { FieldPanel } from "./field-panel";
import { NotesPanel } from "./notes-panel";
import { SectionRail } from "./section-rail";
import { ThemePanel } from "./theme-panel";

const FLUSH_DEBOUNCE_MS = 800;
const FLUSH_RETRY_MS = 5000;
const MAX_FLUSH_RETRIES = 3;

/**
 * Synthetic page key for the shared sign-in / sign-up screen.
 *
 * No template declares fields with `page: "authentication"` — the auth image
 * and logo-size fields are site-wide, so they live on the `global` page. But
 * `global` deliberately has no preview path (its sections are chrome that
 * appears on every page), which left the auth fields editable with nothing to
 * look at. This page key exists purely to give them a preview: it has an entry
 * in `PAGE_PREVIEW_PATHS` and is offered only when the active template really
 * declares the `global.authentication` section.
 */
const AUTH_PAGE = "authentication";

/** Section id whose fields the synthetic Authentication page previews. */
const AUTH_SECTION_ID = "global.authentication";

/** Fallback used only if a draft is somehow requested for an unknown page. */
const EMPTY_CMS_VALUES: CmsPageDraftValues = {
  title: "",
  excerpt: null,
  content: { type: "doc", content: [] },
};

/** A CMS `type:"page"` or `type:"blog"` record as delivered to the editor. */
export type EditorCmsPage = {
  id: string;
  slug: string;
  /** Which CMS kind this is — drives storefront path and admin deep link. */
  type: "page" | "blog";
  published: boolean;
  /** Currently published values (the dirty-comparison baseline). */
  live: CmsPageDraftValues;
  /** Durable per-page draft, or null. */
  draft: CmsPageDraftValues | null;
  /** Whether a durable draft exists on the server. */
  hasDraft: boolean;
};

/** True for an activePage value that addresses a page or blog post (`cms:<pageId>`). */
function isCmsPage(value: string): boolean {
  return value.startsWith("cms:");
}

/** Extract the page id from a `cms:<pageId>` activePage value. */
function cmsPageId(value: string): string {
  return value.slice("cms:".length);
}

/** Storefront path for a CMS entry — blog posts live under `/blog/`. */
function cmsPreviewPath(p: EditorCmsPage): string {
  return p.type === "blog" ? `/blog/${p.slug}` : `/${p.slug}`;
}

/** Advanced-editor deep link for a CMS entry (pages and blog posts differ). */
function cmsAdminHref(p: EditorCmsPage): string {
  return p.type === "blog"
    ? `/admin/content/blog/${p.id}`
    : `/admin/content/pages/${p.id}`;
}

/** The representative product previewed by the "product" page entry. */
export type EditorProductPreview = { slug: string; name: string };

/**
 * Storefront path for a template page key. Every key except `"product"` has a
 * static path; the product page previews a representative product, so its path
 * depends on the resolved sample (and falls back to the homepage without one).
 */
function resolvePreviewPath(
  page: string,
  productPreview: EditorProductPreview | null,
): string {
  if (page === "product") {
    return productPreview ? `/shop/${productPreview.slug}` : "/";
  }
  return PAGE_PREVIEW_PATHS[page] ?? "/";
}

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
  /**
   * The business's CMS entries — `type:"page"` pages plus `type:"blog"` posts
   * (blog posts only when the `blog` flag is on) — editable alongside the
   * template. Both kinds share the same draft/publish machinery; they are split
   * only for display (top-bar groups, storefront path, admin deep link).
   */
  cmsPages: EditorCmsPage[];
  /**
   * Representative product for the "Product" page entry — the newest published
   * product, or null when the business has none (or `products` is off). Null
   * hides the entry entirely and clamps `?page=product` deep links.
   */
  productPreview: EditorProductPreview | null;
  /** All sections for the active template (all pages, template order). */
  sections: TemplateSection[];
  embedsEnabled: boolean;
  mediaEnabled: boolean;
  /** Feature-flag keys enabled for this business — filters field-panel admin links. */
  enabledFeatures: string[];
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
function withoutSpMeta(
  fields: Record<string, unknown>,
): Record<string, unknown> {
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

/** A page title for display, falling back to a placeholder when blank. */
function titleOrUntitled(title: string): string {
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : "Untitled page";
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
  cmsPages,
  productPreview,
  sections,
  embedsEnabled,
  mediaEnabled,
  enabledFeatures,
  initialPage,
  initialSection,
  isPlatformAdmin,
}: VisualEditorProps) {
  /**
   * Whether the synthetic Authentication page is offered for this template.
   * Gated on the template actually declaring the auth section — the 5
   * templates with no `*.global.authentication-image` field would otherwise
   * get a page with an empty rail and nothing to edit.
   */
  const authPageAvailable = useMemo(
    () => sections.some((s) => s.id === AUTH_SECTION_ID),
    [sections],
  );

  /**
   * Whether a template page key can be shown in the preview iframe. Static
   * paths come from `PAGE_PREVIEW_PATHS`; `"product"` is previewable only when
   * a representative product exists, so templates with product-page fields but
   * a business with none published never offer it. `"authentication"` is
   * gated the same way on the template declaring the auth section — the check
   * must come FIRST, since the key is in `PAGE_PREVIEW_PATHS` for every
   * template and would otherwise pass unconditionally.
   */
  const isPreviewablePage = useCallback(
    (key: string) => {
      if (key === AUTH_PAGE) return authPageAvailable;
      return (
        key in PAGE_PREVIEW_PATHS ||
        (key === "product" && productPreview !== null)
      );
    },
    [productPreview, authPageAvailable],
  );

  // Selectable pages: page keys that have both template fields and a preview
  // path. `groupFieldsByPage` only yields keys the template declares fields
  // for, so "product" appears only on templates migrated to product-page
  // fields AND businesses with a previewable product.
  const pages: EditorTopBarPage[] = useMemo(() => {
    const fromFields = Object.keys(groupFieldsByPage(templateId))
      .filter((key) => isPreviewablePage(key))
      .map((key) => ({ value: key, label: pageLabel(key) }));
    // The auth fields are declared on the `global` page, so this entry can
    // never come out of `groupFieldsByPage` — append it explicitly.
    return authPageAvailable
      ? [...fromFields, { value: AUTH_PAGE, label: pageLabel(AUTH_PAGE) }]
      : fromFields;
  }, [templateId, isPreviewablePage, authPageAvailable]);

  const enabledFeatureSet = useMemo(
    () => new Set(enabledFeatures),
    [enabledFeatures],
  );

  // Field type lookup — text/textarea fields get the live-patch fast path.
  const fieldTypeByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const fields of Object.values(groupFieldsByPage(templateId))) {
      for (const field of fields) map.set(field.key, field.type);
    }
    return map;
  }, [templateId]);

  const cmsPageById = useMemo(() => {
    const map = new Map<string, EditorCmsPage>();
    for (const p of cmsPages) map.set(p.id, p);
    return map;
  }, [cmsPages]);

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
      isPreviewablePage(deepLinkedSection.page))
      ? deepLinkedSection
      : null;
  const clampedInitialPage =
    // A validated CMS deep link (page.tsx already checked the id) wins — CMS
    // pages have no sections, so the section branch never applies to them.
    isCmsPage(initialPage) && cmsPageById.has(cmsPageId(initialPage))
      ? initialPage
      : // The auth section is declared on `global` but has a preview page of
        // its own, so `?section=global.authentication` lands there rather than
        // opening the panel over an unrelated page.
        initialSectionObj?.id === AUTH_SECTION_ID && authPageAvailable
        ? AUTH_PAGE
        : initialSectionObj &&
            initialSectionObj.page !== "global" &&
            isPreviewablePage(initialSectionObj.page)
          ? initialSectionObj.page
          : isPreviewablePage(initialPage)
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

  // ── CMS page state ──
  // CMS pages are edited entirely through the right-hand panel (they have no
  // in-preview hotspots), so opening the editor on a CMS page opens the panel.
  const [cmsPanelOpen, setCmsPanelOpen] = useState(() =>
    isCmsPage(clampedInitialPage),
  );
  const [notesOpen, setNotesOpen] = useState(false);
  /** LIVE values per page id — the per-page dirty-comparison baseline. */
  const [cmsBaselines, setCmsBaselines] = useState<
    Record<string, CmsPageDraftValues>
  >(() => {
    const map: Record<string, CmsPageDraftValues> = {};
    for (const p of cmsPages) map[p.id] = p.live;
    return map;
  });
  /** Working per-page values — resumes a durable draft when present. */
  const [cmsDrafts, setCmsDrafts] = useState<
    Record<string, CmsPageDraftValues>
  >(() => {
    const map: Record<string, CmsPageDraftValues> = {};
    for (const p of cmsPages) map[p.id] = p.draft ?? p.live;
    return map;
  });
  /** Page ids whose draft is persisted server-side. */
  const [serverCmsDraftIds, setServerCmsDraftIds] = useState<Set<string>>(
    () => {
      const set = new Set<string>();
      for (const p of cmsPages) if (p.hasDraft) set.add(p.id);
      return set;
    },
  );

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
  /** Page ids with unflushed local CMS edits — mirror of what the flush owes. */
  const pendingCmsFlushIdsRef = useRef<Set<string>>(new Set());
  /** Ref mirror of `cmsDrafts` so the flush reads the newest values. */
  const cmsDraftsRef = useRef(cmsDrafts);

  const savePreviewDraft = api.content.savePreviewDraft.useMutation();
  const saveCmsPageDraft = api.content.saveCmsPageDraft.useMutation();
  const utils = api.useUtils();

  // Keep the ref mirror in sync with the `fields` state. This is the single
  // place that writes `latestFieldsRef` in response to a state change — state
  // updater functions themselves must stay pure and must not reach outside
  // to mutate a ref, so callers below only ever `return next` from their
  // updater and let this effect do the mirroring.
  useEffect(() => {
    latestFieldsRef.current = fields;
  }, [fields]);

  // Same mirror pattern for CMS drafts — the flush reads this ref, not state.
  useEffect(() => {
    cmsDraftsRef.current = cmsDrafts;
  }, [cmsDrafts]);

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
    // Snapshot-and-clear the CMS work this flush owns. New edits that arrive
    // mid-flight re-populate the ref and are picked up by the queued re-flush.
    const cmsIds = Array.from(pendingCmsFlushIdsRef.current);
    pendingCmsFlushIdsRef.current.clear();
    const failedCmsIds: string[] = [];
    const deferredCmsIds: string[] = [];

    let draftOk = false;
    // The site-content preview draft is always saved (unchanged behavior) —
    // when nothing CMS is pending, this flush is byte-identical to before.
    const draftAttempt = savePreviewDraft
      .mutateAsync({ customFields: latestFieldsRef.current })
      .then(() => {
        draftOk = true;
      })
      .catch(() => {
        draftOk = false;
      });
    const cmsAttempts = cmsIds.map((id) => {
      const values = cmsDraftsRef.current[id];
      if (!values) return Promise.resolve();
      // The server rejects an empty title, so a mid-rename flush would just
      // churn the retry loop. Defer this page (not a failure) until the owner
      // types a title; the next edit's flush picks it back up.
      if (values.title.trim() === "") {
        deferredCmsIds.push(id);
        return Promise.resolve();
      }
      return saveCmsPageDraft
        .mutateAsync({ pageId: id, draft: values })
        .then(() => undefined)
        .catch(() => {
          failedCmsIds.push(id);
        });
    });
    // Each sub-attempt swallows its own rejection, so this never rejects —
    // preserving the `inFlightPromiseRef` "never rejects" invariant.
    const attempt = Promise.all([draftAttempt, ...cmsAttempts]).then(
      () => undefined,
    );
    inFlightPromiseRef.current = attempt;
    await attempt;
    inFlightRef.current = false;
    inFlightPromiseRef.current = null;
    setIsUpdating(false);
    const ok = draftOk && failedCmsIds.length === 0;

    // Superseded by publish/discard while in flight — they own state now.
    if (flushEpochRef.current !== epoch) {
      queuedRef.current = false;
      return;
    }

    // Epoch still ours: reflect which CMS drafts landed, and re-queue any that
    // failed so the retry loop below (which re-reads the ref) covers them.
    const succeededCmsIds = cmsIds.filter((id) => !failedCmsIds.includes(id));
    if (succeededCmsIds.length > 0) {
      setServerCmsDraftIds((prev) => {
        const next = new Set(prev);
        for (const id of succeededCmsIds) next.add(id);
        return next;
      });
    }
    for (const id of failedCmsIds) pendingCmsFlushIdsRef.current.add(id);
    for (const id of deferredCmsIds) pendingCmsFlushIdsRef.current.add(id);

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
  }, [savePreviewDraft, saveCmsPageDraft, setFlushPendingState]);

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
      if (
        (type === "text" || type === "textarea") &&
        typeof value === "string"
      ) {
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

  /**
   * Funnel for every CMS page edit. Mirrors `applyFieldUpdate`'s settling
   * guard. CMS content renders server-side only — there is no live-patch fast
   * path, so every edit reloads the preview on the next flush.
   */
  const applyCmsUpdate = useCallback(
    (pageId: string, patch: Partial<CmsPageDraftValues>) => {
      if (mutationPendingRef.current) {
        notifyEditBlocked();
        return;
      }
      setCmsDrafts((prev) => {
        const current = prev[pageId] ?? EMPTY_CMS_VALUES;
        return { ...prev, [pageId]: { ...current, ...patch } };
      });
      pendingCmsFlushIdsRef.current.add(pageId);
      refreshNeededRef.current = true;
      scheduleFlush();
    },
    [scheduleFlush, notifyEditBlocked],
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
      // CMS drafts were promoted to live in the same transaction — the current
      // working set IS the new baseline, and no server drafts remain.
      setCmsBaselines({ ...cmsDraftsRef.current });
      setServerCmsDraftIds(new Set());
      pendingCmsFlushIdsRef.current.clear();
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

      // CMS page drafts publish from their DB column (unlike customFields,
      // which travel in the payload), so any unflushed page edit must be
      // persisted BEFORE the publish mutation promotes drafts to live. If this
      // save fails, abort the whole publish rather than silently drop edits.
      const pendingCmsIds = Array.from(pendingCmsFlushIdsRef.current);
      if (pendingCmsIds.length > 0) {
        // An empty page title can never be saved or published — surface it
        // now instead of failing the save below with an opaque error.
        const untitled = pendingCmsIds.find(
          (id) => cmsDraftsRef.current[id]?.title.trim() === "",
        );
        if (untitled) {
          const entry = cmsPageById.get(untitled);
          toast.error(
            entry
              ? `The "${cmsPreviewPath(entry)}" ${
                  entry.type === "blog" ? "post" : "page"
                } needs a title before you can publish`
              : "Every page needs a title before you can publish",
          );
          setMutationPendingState(false);
          return;
        }
        pendingCmsFlushIdsRef.current.clear();
        try {
          await Promise.all(
            pendingCmsIds.map((id) => {
              const values = cmsDraftsRef.current[id];
              if (!values) return Promise.resolve();
              return saveCmsPageDraft.mutateAsync({
                pageId: id,
                draft: values,
              });
            }),
          );
          setServerCmsDraftIds((prev) => {
            const next = new Set(prev);
            for (const id of pendingCmsIds) next.add(id);
            return next;
          });
        } catch {
          toast.error("Couldn't save page edits — publish canceled");
          for (const id of pendingCmsIds) pendingCmsFlushIdsRef.current.add(id);
          scheduleFlush();
          setMutationPendingState(false);
          return;
        }
      }

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
        publishCmsPageDrafts: true,
      });
    })();
  }, [
    cancelPendingFlush,
    cmsPageById,
    publish,
    saveCmsPageDraft,
    scheduleFlush,
    setFlushPendingState,
    setMutationPendingState,
    utils,
    publishedFields,
  ]);

  // ── Discard ──
  const clearDraft = api.content.discardEditorDrafts.useMutation({
    onSuccess: () => {
      setFlushPendingState(false);
      setFields(publishedFields);
      latestFieldsRef.current = publishedFields;
      setServerHasDraft(false);
      setSaveFailed(false);
      refreshNeededRef.current = false;
      unackedPatchKeysRef.current.clear();
      // CMS drafts were being previewed too — revert them to the live baseline
      // and drop every pending/server draft. The iframe refresh below re-renders
      // the preview with the reverted content.
      setCmsDrafts({ ...cmsBaselines });
      setServerCmsDraftIds(new Set());
      pendingCmsFlushIdsRef.current.clear();
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
  const cmsDirty = useMemo(() => {
    if (serverCmsDraftIds.size > 0) return true;
    for (const [id, draft] of Object.entries(cmsDrafts)) {
      const base = cmsBaselines[id];
      if (base && stableStringify(draft) !== stableStringify(base)) return true;
    }
    return false;
  }, [serverCmsDraftIds, cmsDrafts, cmsBaselines]);
  const hasUnpublishedChanges = serverHasDraft || localDiffers || cmsDirty;

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
    () =>
      // The auth section's `page` is "global", so it never matches the
      // synthetic page key — list it explicitly while that page is open.
      activePage === AUTH_PAGE
        ? sections.filter((s) => s.id === AUTH_SECTION_ID)
        : sections.filter((s) => s.page === activePage),
    [sections, activePage],
  );
  const globalSections = useMemo(
    () =>
      sections.filter(
        (s) =>
          s.page === "global" &&
          // Moved out of the pinned "Site-wide" group and onto its own page,
          // so it appears exactly once. Templates that never declare it aren't
          // affected (nothing to filter, and no Authentication page either).
          !(authPageAvailable && s.id === AUTH_SECTION_ID),
      ),
    [sections, authPageAvailable],
  );
  const activeSection = useMemo(
    () => sections.find((s) => s.id === activeSectionId) ?? null,
    [sections, activeSectionId],
  );

  // ── Active CMS page ──
  const activeCmsId = isCmsPage(activePage) ? cmsPageId(activePage) : null;
  const activeCmsPage = activeCmsId
    ? (cmsPageById.get(activeCmsId) ?? null)
    : null;
  // Sections rendered on individual blog posts (e.g. the end-of-article CTA) —
  // offered in the rail while previewing a blog post CMS entry.
  const blogPostSections = useMemo(
    () =>
      activeCmsPage?.type === "blog"
        ? sections.filter(isBlogPostContextSection)
        : [],
    [sections, activeCmsPage],
  );
  // The rail/panel/label all read the DRAFT title so renames reflect live.
  const activeCmsTitle =
    activeCmsId !== null
      ? (
          cmsDrafts[activeCmsId]?.title ??
          activeCmsPage?.live.title ??
          ""
        ).trim()
      : "";

  const previewPath = activeCmsPage
    ? cmsPreviewPath(activeCmsPage)
    : resolvePreviewPath(activePage, productPreview);

  // The product page previews ONE sample product — say so, so an owner never
  // reads a per-product edit into what is really a site-wide default. The auth
  // page previews ONE of several screens that share the same shell, and its
  // side image is a `lg:` -only element, so both facts are called out too.
  const previewNotice = activeCmsPage
    ? undefined
    : activePage === "product" && productPreview
      ? `Previewing "${productPreview.name}" — changes here apply to every product page`
      : activePage === AUTH_PAGE
        ? "Previewing the sign-in screen — these settings appear on every sign-in and sign-up page. The side image is hidden at tablet and mobile widths."
        : undefined;

  // Human label for the active page — template label, or CMS draft title.
  const activePageLabel = useMemo(() => {
    if (activeCmsId !== null) return titleOrUntitled(activeCmsTitle);
    return (
      pages.find((p) => p.value === activePage)?.label ?? pageLabel(activePage)
    );
  }, [activeCmsId, activeCmsTitle, pages, activePage]);

  // CMS Select entries for the top bar (value `cms:<id>`, label = draft title).
  // Split by kind so the top bar can render pages and blog posts as separate
  // groups — the underlying page keys and draft machinery are identical.
  const cmsPageSelectItems: EditorTopBarCmsPage[] = useMemo(
    () =>
      cmsPages
        .filter((p) => p.type === "page")
        .map((p) => ({
          value: `cms:${p.id}`,
          label: titleOrUntitled(cmsDrafts[p.id]?.title ?? p.live.title),
          unpublished: !p.published,
        })),
    [cmsPages, cmsDrafts],
  );

  const blogPostSelectItems: EditorTopBarCmsPage[] = useMemo(
    () =>
      cmsPages
        .filter((p) => p.type === "blog")
        .map((p) => ({
          value: `cms:${p.id}`,
          label: titleOrUntitled(cmsDrafts[p.id]?.title ?? p.live.title),
          unpublished: !p.published,
        })),
    [cmsPages, cmsDrafts],
  );

  const handleSelectSection = useCallback(
    (section: TemplateSection) => {
      setNotesOpen(false);
      setThemeOpen(false);
      // A section can be picked while a CMS preview is open (blog posts list
      // their article + site-wide sections) — swap the right panel to fields.
      setCmsPanelOpen(false);
      setActiveSectionId(section.id);

      // The auth section renders ONLY on /auth/*, so it is never present in
      // the current preview document unless its own page is already open.
      // Switch to that page instead of posting a focus message the iframe
      // can't satisfy. (Every other global section is chrome that renders on
      // whatever page is showing, so they keep focusing in place.)
      if (
        section.id === AUTH_SECTION_ID &&
        authPageAvailable &&
        activePage !== AUTH_PAGE
      ) {
        // The iframe is about to navigate — focusing now would post to the
        // outgoing document. The rail row stays selected across the switch.
        setActivePage(AUTH_PAGE);
        return;
      }

      // focusGroup expects the BARE group name — the overlay rebuilds the
      // full data-sp-group value as `${page}.${group}` (see preview-overlay).
      const bareGroup = section.id.startsWith(`${section.page}.`)
        ? section.id.slice(section.page.length + 1)
        : section.id;
      previewRef.current?.focusGroup(section.page, bareGroup);
    },
    [activePage, authPageAvailable],
  );

  const handlePageChange = useCallback((page: string) => {
    setActivePage(page);
    // Close the panel — the previously open section belongs to another page.
    setActiveSectionId(null);
    if (isCmsPage(page)) {
      // Generic pages have no hotspots — the panel is the only edit surface,
      // so open it and close the template-only right panels + notes.
      setThemeOpen(false);
      setNotesOpen(false);
      setCmsPanelOpen(true);
    } else {
      // Leaving a CMS page closes its panel; template panel behavior (theme,
      // section) is otherwise unchanged from before.
      setCmsPanelOpen(false);
    }
  }, []);

  const handleOpenCmsPanel = useCallback(() => {
    setNotesOpen(false);
    setThemeOpen(false);
    setActiveSectionId(null);
    setCmsPanelOpen(true);
  }, []);

  // One right panel at a time: opening notes closes field/theme/CMS panels.
  const handleToggleNotes = useCallback(() => {
    setNotesOpen((open) => {
      const next = !open;
      if (next) {
        setActiveSectionId(null);
        setThemeOpen(false);
        setCmsPanelOpen(false);
      }
      return next;
    });
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
      // A CMS preview shows no template page, so the page-switch branch below
      // must never run here — it would navigate away from the entry the owner
      // is editing. Blog posts DO render template sections (the end-of-article
      // CTA, plus site-wide chrome), so accept hotspots for those in place and
      // ignore anything else.
      if (isCmsPage(activePage)) {
        if (activeCmsPage?.type !== "blog") return;
        const section = sections.find(
          (s) =>
            s.id === group &&
            (isBlogPostContextSection(s) || s.page === "global"),
        );
        if (!section) return;
        setNotesOpen(false);
        setThemeOpen(false);
        setCmsPanelOpen(false);
        setActiveSectionId(group);
        return;
      }
      if (page !== activePage && isPreviewablePage(page)) {
        setActivePage(page);
      }
      setNotesOpen(false);
      setThemeOpen(false);
      setActiveSectionId(group);
    },
    [activePage, activeCmsPage, sections, isPreviewablePage],
  );

  const handleSelectTheme = useCallback(() => {
    setNotesOpen(false);
    setActiveSectionId(null);
    setThemeOpen(true);
  }, []);

  const isPublishing = publish.isPending || clearDraft.isPending;

  // Notes badge count. The NotesPanel issues the same query — React Query
  // dedupes them by key, so this is a single request shared with the panel.
  const notesListQuery = api.editorNote.listMine.useQuery();
  const openNotesCount = useMemo(
    () => (notesListQuery.data ?? []).filter((n) => n.status === "open").length,
    [notesListQuery.data],
  );

  return (
    <div className="flex h-full flex-col">
      <EditorTopBar
        businessName={businessName}
        templateId={templateId}
        pages={pages}
        cmsPages={cmsPageSelectItems}
        blogPosts={blogPostSelectItems}
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
        notesOpen={notesOpen}
        openNotesCount={openNotesCount}
        onToggleNotes={handleToggleNotes}
      />

      <div className="flex min-h-0 flex-1">
        {activeCmsPage && activeCmsId !== null ? (
          <CmsPageRail
            pageTitle={titleOrUntitled(activeCmsTitle)}
            kind={activeCmsPage.type}
            adminHref={cmsAdminHref(activeCmsPage)}
            isActive={cmsPanelOpen}
            onSelect={handleOpenCmsPanel}
            sections={blogPostSections}
            globalSections={globalSections}
            activeSectionId={activeSectionId}
            hiddenSectionIds={hiddenSectionIds}
            onSelectSection={handleSelectSection}
            onToggleVisibility={handleToggleVisibility}
          />
        ) : (
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
        )}

        <EditorPreview
          path={previewPath}
          width={DEVICE_WIDTHS[device]}
          isUpdating={isUpdating}
          notice={previewNotice}
          onEditGroup={handleEditGroup}
          onPatched={handlePatched}
          frameRef={previewRef}
        />

        {/* One right panel at a time: notes > CMS page > theme > field. The
            open-handlers keep these states mutually exclusive; this chain is
            the belt-and-suspenders guarantee. */}
        {notesOpen ? (
          <NotesPanel
            activePageKey={activePage}
            activePageLabel={activePageLabel}
            onClose={() => setNotesOpen(false)}
          />
        ) : activeCmsPage && cmsPanelOpen && activeCmsId !== null ? (
          <CmsPagePanel
            pageId={activeCmsId}
            pageTitle={activeCmsTitle}
            kind={activeCmsPage.type}
            published={activeCmsPage.published}
            values={cmsDrafts[activeCmsId] ?? activeCmsPage.live}
            baseline={cmsBaselines[activeCmsId] ?? activeCmsPage.live}
            onChange={(patch) => applyCmsUpdate(activeCmsId, patch)}
            disabled={isPublishing || mutationPending}
            onClose={() => setCmsPanelOpen(false)}
            adminHref={cmsAdminHref(activeCmsPage)}
          />
        ) : themeOpen && templateTheme ? (
          <ThemePanel
            theme={templateTheme}
            selection={themeSelection}
            onSelect={handleThemeSelect}
            disabled={isPublishing || mutationPending}
            onClose={() => setThemeOpen(false)}
          />
        ) : !themeOpen && activeSection ? (
          <FieldPanel
            section={activeSection}
            templateId={templateId}
            fields={fields}
            publishedFields={publishedFields}
            onFieldChange={applyFieldUpdate}
            embedsEnabled={embedsEnabled}
            mediaEnabled={mediaEnabled}
            enabledFeatures={enabledFeatureSet}
            disabled={isPublishing || mutationPending}
            onClose={() => setActiveSectionId(null)}
            hint={
              // Opened from a template page, but it only renders on posts —
              // point the owner at the preview that actually shows it.
              isBlogPostContextSection(activeSection) && !isCmsPage(activePage)
                ? "This section appears at the end of every blog post — open a post from the page menu to preview it."
                : undefined
            }
          />
        ) : null}
      </div>
    </div>
  );
}
