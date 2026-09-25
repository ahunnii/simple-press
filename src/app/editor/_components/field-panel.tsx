"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";

import type { PanelVariant } from "./panel-variant";
import type { TemplateListFocusRequest } from "~/app/admin/content/template/_components/template-field-widgets";
import type { TemplateField } from "~/lib/template-fields";
import type { TemplateSection } from "~/lib/template-sections";
import {
  buildFieldsByKey,
  getGroupMetadata,
  groupFieldsByGroup,
  groupFieldsByPage,
  isFieldVisible,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { FieldInput } from "~/app/admin/content/template/_components/template-field-widgets";

import {
  PANEL_ASIDE_CLASS,
  PANEL_CLOSE_BUTTON_CLASS,
  PANEL_SHEET_BODY_CLASS,
  PANEL_SHEET_SETTLE_MS,
} from "./panel-variant";

/**
 * Ask the panel to reveal one field — set when the owner clicks a specific
 * element in the preview. `nonce` must change per request; the panel acts
 * once per nonce.
 */
export type FieldFocusRequest = {
  /** Template field key, e.g. "bamboo.homepage.hero-title". */
  fieldKey: string;
  /** `list` fields only: 0-based row to expand + focus. */
  itemIndex?: number;
  nonce: number;
};

/** Preferred focus targets: text entry (skips hidden / Radix bubble inputs). */
const TEXT_FOCUS_SELECTOR = [
  'input:not([type="hidden"]):not([type="file"]):not([disabled]):not([aria-hidden="true"]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([aria-hidden="true"]):not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(", ");

/** Fallback for fields with no text entry (image, select, toggle…). */
const ANY_FOCUS_SELECTOR = [
  TEXT_FOCUS_SELECTOR,
  'button:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([aria-hidden="true"]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/** Runs `cb` after two animation frames (React committed + layout done). */
function afterPaint(cb: () => void): () => void {
  let second = 0;
  const first = requestAnimationFrame(() => {
    second = requestAnimationFrame(cb);
  });
  return () => {
    cancelAnimationFrame(first);
    cancelAnimationFrame(second);
  };
}

function findFieldWrapper(
  container: HTMLElement | null,
  fieldKey: string,
): HTMLElement | null {
  if (!container) return null;
  // Compared via `dataset` so field keys never need CSS escaping.
  for (const el of container.querySelectorAll<HTMLElement>(
    "[data-field-key]",
  )) {
    if (el.dataset.fieldKey === fieldKey) return el;
  }
  return null;
}

/**
 * `scrollIntoView({ block: "nearest" })` confined to the panel body: only the
 * body scrolls, never the page / sheet behind it (the compact sheet is a
 * fixed, transformed layer where a document-level scroll would misfire).
 */
function scrollIntoContainer(container: HTMLElement, el: HTMLElement) {
  const margin = 12;
  const box = container.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  if (rect.top < box.top + margin) {
    container.scrollTop += rect.top - box.top - margin;
  } else if (rect.bottom > box.bottom - margin) {
    // Taller than the viewport → align the top rather than the bottom.
    container.scrollTop += Math.min(
      rect.bottom - box.bottom + margin,
      rect.top - box.top - margin,
    );
  }
}

/**
 * Stable stringify (sorted keys at every level) for order-insensitive
 * per-field dirty comparison. Kept local rather than imported from
 * `visual-editor.tsx` to avoid a circular import between the two modules.
 */
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

export type FieldPanelProps = {
  /** The section being edited. The parent only mounts this panel once a
   *  section is selected, so there is no empty state to render here. */
  section: TemplateSection;
  /** Active template — used to resolve field definitions and group metadata. */
  templateId: string;
  /** Current (draft) field values keyed by field key. */
  fields: Record<string, unknown>;
  /** Currently published field values — the per-field dirty-comparison baseline. */
  publishedFields: Record<string, unknown>;
  /** Route every edit through here so a Phase 2 live-patch path can hook in. */
  onFieldChange: (key: string, value: unknown) => void;
  /** Whether the Embeds feature is enabled for this business. */
  embedsEnabled: boolean;
  /** Whether the Media Library feature is enabled — gates the "Choose from
   *  library" picker on image/video fields. */
  mediaEnabled: boolean;
  /** Feature-flag keys enabled for this business — hides links to disabled
   *  admin surfaces in the "Related content" block. */
  enabledFeatures: ReadonlySet<string>;
  /** Freeze inputs while publish/discard is settling (edits would race it). */
  disabled?: boolean;
  /** Close the panel (deselect the active section). */
  onClose: () => void;
  /** Desktop right column (default) or compact bottom-sheet content. */
  variant?: PanelVariant;
  /** Contextual note shown under the section description — e.g. telling the
   *  owner this section appears on individual blog posts. */
  hint?: string;
  /**
   * Reveal one field (preview click on a specific element). Non-list fields
   * are scrolled into view and their first control focused; list fields get
   * the row expanded + focused by the list editor. Ignored when the field is
   * not rendered in this section (absent or hidden by `visibleWhen`).
   */
  focusRequest?: FieldFocusRequest | null;
};

/**
 * Right-hand contextual editor. Renders the `FieldInput` widgets for every
 * field group in the active section, wired to `onFieldChange`. Owns its own
 * scroll.
 */
export function FieldPanel({
  section,
  templateId,
  fields,
  publishedFields,
  onFieldChange,
  embedsEnabled,
  mediaEnabled,
  enabledFeatures,
  disabled = false,
  onClose,
  variant = "sidebar",
  hint,
  focusRequest,
}: FieldPanelProps) {
  const fieldsByPage = groupFieldsByPage(templateId);
  const pageFields = fieldsByPage[section.page] ?? [];
  const byGroup = groupFieldsByGroup(pageFields);
  // Span the whole template, not just this page, so a `visibleWhen`
  // controlling field defined on another page still resolves correctly.
  const fieldsByKey = buildFieldsByKey(Object.values(fieldsByPage).flat());

  // Entity-backed sections (product rails, testimonials, blog…) point the
  // owner at the admin surface that actually owns their content — the field
  // panel only edits headings and copy.
  const visibleLinks = (section.links ?? []).filter(
    (link) => !link.featureKey || enabledFeatures.has(link.featureKey),
  );

  // Visible fields per group, computed once for both rendering and focus
  // resolution.
  const renderedGroups = section.groupIds.map((groupId) => {
    const isOther = groupId.endsWith(".__other");
    const groupFieldsRaw = isOther
      ? (byGroup.ungrouped ?? [])
      : (byGroup[groupId] ?? []);
    return {
      groupId,
      isOther,
      fields: groupFieldsRaw.filter((field) =>
        isFieldVisible(field, fields, fieldsByKey),
      ),
    };
  });

  // Curated sections list groupIds that may not resolve to any field for this
  // template (e.g. a group id referencing fields the template never defined).
  // Detect that up front so we can render a message instead of a blank panel.
  const hasAnyGroupFields = renderedGroups.some((g) => g.fields.length > 0);

  // Read by the focus effect (which runs per request, not per render).
  const renderedFieldsRef = useRef<Map<string, TemplateField>>(new Map());
  renderedFieldsRef.current = new Map(
    renderedGroups.flatMap((g) => g.fields.map((f) => [f.key, f] as const)),
  );
  const fieldValuesRef = useRef(fields);
  fieldValuesRef.current = fields;

  const bodyRef = useRef<HTMLDivElement>(null);
  /** The list-editor request currently handed to one list field. */
  const [listRequest, setListRequest] = useState<{
    fieldKey: string;
    request: TemplateListFocusRequest;
  } | null>(null);

  const requestNonce = focusRequest?.nonce;
  const requestFieldKey = focusRequest?.fieldKey;
  const requestItemIndex = focusRequest?.itemIndex;
  useEffect(() => {
    if (requestNonce === undefined || requestFieldKey === undefined) return;
    const field = renderedFieldsRef.current.get(requestFieldKey);
    // Not in this section, or hidden by `visibleWhen` — the section opening
    // is all the owner gets.
    if (!field) return;

    let cancelPaint: () => void = () => undefined;
    const reveal = () => {
      const body = bodyRef.current;
      const wrapper = findFieldWrapper(body, requestFieldKey);
      if (!body || !wrapper) return null;
      scrollIntoContainer(body, wrapper);
      return wrapper;
    };

    // The compact sheet is still sliding / re-snapping when a preview tap
    // opens it — wait for it to settle so we measure the final body.
    const timer = setTimeout(
      () => {
        if (field.type === "list") {
          // The list editor expands, scrolls to, and focuses the row itself.
          setListRequest({
            fieldKey: requestFieldKey,
            request: { itemIndex: requestItemIndex, nonce: requestNonce },
          });
          // A row it can't open (no index, or storefront DEFAULT rows past
          // the saved ones) still reveals the list.
          const saved = fieldValuesRef.current[requestFieldKey];
          const inRange =
            requestItemIndex !== undefined &&
            Array.isArray(saved) &&
            requestItemIndex < saved.length;
          if (!inRange) cancelPaint = afterPaint(() => void reveal());
          return;
        }
        cancelPaint = afterPaint(() => {
          const wrapper = reveal();
          const target =
            wrapper?.querySelector<HTMLElement>(TEXT_FOCUS_SELECTOR) ??
            wrapper?.querySelector<HTMLElement>(ANY_FOCUS_SELECTOR);
          target?.focus({ preventScroll: true });
        });
      },
      variant === "sheet" ? PANEL_SHEET_SETTLE_MS : 0,
    );
    return () => {
      clearTimeout(timer);
      cancelPaint();
      // Drop the handed-off list request with its originating request, so a
      // list editor remounting later (section re-opened from the rail) does
      // not replay it.
      setListRequest(null);
    };
    // `variant` is read once per request on purpose — a layout switch
    // mid-request shouldn't replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestNonce, requestFieldKey, requestItemIndex]);

  return (
    <aside className={PANEL_ASIDE_CLASS[variant]}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{section.title}</h2>
          {section.description && (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
              {section.description}
            </p>
          )}
          {hint && (
            <p className="text-muted-foreground/80 mt-1 text-xs italic">
              {hint}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={PANEL_CLOSE_BUTTON_CLASS[variant]}
          aria-label="Close section editor"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        aria-disabled={disabled || undefined}
        // `inert` (not just pointer-events-none) removes the whole subtree
        // from the tab order and blocks keyboard interaction with its
        // inputs — pointer-events-none alone only stops mouse/touch input,
        // so a keyboard user could still Tab into and edit a "disabled"
        // panel.
        inert={disabled || undefined}
        className={cn(
          "flex-1 space-y-5 overflow-y-auto px-4 py-4",
          disabled && "pointer-events-none opacity-60",
          variant === "sheet" && PANEL_SHEET_BODY_CLASS,
        )}
      >
        {!hasAnyGroupFields && (
          <p className="text-muted-foreground text-sm">
            This section has no editable fields.
          </p>
        )}

        {renderedGroups.map(
          ({ groupId, isOther, fields: groupFields }, index) => {
            if (groupFields.length === 0) return null;

            const groupMeta = isOther
              ? undefined
              : getGroupMetadata(templateId, groupId);

            return (
              <div
                key={groupId}
                className={cn("space-y-4", index > 0 && "border-t pt-5")}
              >
                {section.groupIds.length > 1 &&
                  groupMeta &&
                  (groupMeta.title || groupMeta.description) && (
                    <div className="flex items-center gap-2">
                      {groupMeta.icon && (
                        <span className="text-base">{groupMeta.icon}</span>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium">
                          {groupMeta.title}
                        </h3>
                        {groupMeta.description && (
                          <p className="text-muted-foreground text-xs">
                            {groupMeta.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                <div className="space-y-5">
                  {groupFields.map((field) => (
                    // Wrapper = scroll/focus target for preview-click requests.
                    <div key={field.key} data-field-key={field.key}>
                      <FieldInput
                        field={field}
                        value={fields[field.key]}
                        isModified={
                          stableStringify(fields[field.key]) !==
                          stableStringify(publishedFields[field.key])
                        }
                        onChange={(value) => onFieldChange(field.key, value)}
                        embedsEnabled={embedsEnabled}
                        mediaLibraryEnabled={mediaEnabled}
                        listFocusRequest={
                          listRequest?.fieldKey === field.key
                            ? listRequest.request
                            : null
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          },
        )}

        {visibleLinks.length > 0 && (
          <div className="space-y-2 border-t pt-5">
            <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Related content
            </h3>
            <div className="space-y-1">
              {visibleLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  // New tab: same-tab navigation would leave the editor and
                  // could drop an edit still inside the save debounce window.
                  target="_blank"
                  rel="noopener"
                  className="hover:bg-accent focus-visible:ring-ring flex items-start gap-2 rounded-md px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <ExternalLink className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {link.label}
                    </span>
                    {link.description && (
                      <span className="text-muted-foreground block text-xs">
                        {link.description}
                      </span>
                    )}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
