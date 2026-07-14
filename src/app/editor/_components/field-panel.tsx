"use client";

import { X } from "lucide-react";

import type { TemplateSection } from "~/lib/template-sections";
import {
  getGroupMetadata,
  groupFieldsByGroup,
  groupFieldsByPage,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

import { FieldInput } from "~/app/admin/content/template/_components/template-field-widgets";

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
  /** Freeze inputs while publish/discard is settling (edits would race it). */
  disabled?: boolean;
  /** Close the panel (deselect the active section). */
  onClose: () => void;
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
  disabled = false,
  onClose,
}: FieldPanelProps) {
  const pageFields = groupFieldsByPage(templateId)[section.page] ?? [];
  const byGroup = groupFieldsByGroup(pageFields);

  // Curated sections list groupIds that may not resolve to any field for this
  // template (e.g. a group id referencing fields the template never defined).
  // Detect that up front so we can render a message instead of a blank panel.
  const hasAnyGroupFields = section.groupIds.some((groupId) => {
    const isOther = groupId.endsWith(".__other");
    const groupFields = isOther
      ? (byGroup.ungrouped ?? [])
      : (byGroup[groupId] ?? []);
    return groupFields.length > 0;
  });

  return (
    <aside className="bg-card animate-in slide-in-from-right-8 fade-in flex w-[380px] shrink-0 flex-col border-l duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{section.title}</h2>
          {section.description && (
            <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
              {section.description}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Close section editor"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Body */}
      <div
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
        )}
      >
        {!hasAnyGroupFields && (
          <p className="text-muted-foreground text-sm">
            This section has no editable fields.
          </p>
        )}

        {section.groupIds.map((groupId, index) => {
          const isOther = groupId.endsWith(".__other");
          const groupFields = isOther
            ? (byGroup.ungrouped ?? [])
            : (byGroup[groupId] ?? []);
          if (groupFields.length === 0) return null;

          const groupMeta = isOther
            ? undefined
            : getGroupMetadata(templateId, groupId);

          return (
            <div
              key={groupId}
              className={cn("space-y-4", index > 0 && "border-t pt-5")}
            >
              {groupMeta && (groupMeta.title || groupMeta.description) && (
                <div className="flex items-center gap-2">
                  {groupMeta.icon && (
                    <span className="text-base">{groupMeta.icon}</span>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium">{groupMeta.title}</h3>
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
                  <FieldInput
                    key={field.key}
                    field={field}
                    value={fields[field.key]}
                    isModified={
                      stableStringify(fields[field.key]) !==
                      stableStringify(publishedFields[field.key])
                    }
                    onChange={(value) => onFieldChange(field.key, value)}
                    embedsEnabled={embedsEnabled}
                    mediaLibraryEnabled={mediaEnabled}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
