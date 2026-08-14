"use client";

import type { Content } from "@tiptap/react";
import { X } from "lucide-react";

import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { MinimalTiptapEditor } from "~/components/ui/minimal-tiptap";
import { Textarea } from "~/components/ui/textarea";
import { uploadRichTextImage } from "~/components/inputs/minimal-tiptap-form-field";

const EMPTY_TIPTAP_DOC = { type: "doc", content: [] } as const;

/**
 * Stable stringify (sorted keys at every level) for order-insensitive
 * per-field dirty comparison. Copied from `field-panel.tsx` rather than
 * imported to avoid a cross-import between sibling panel modules — keep the
 * two implementations in sync if either changes.
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

export type CmsPageDraftValues = {
  title: string;
  excerpt: string | null;
  content: unknown; // TipTap JSON
};

export type CmsPagePanelProps = {
  /** The page being edited. */
  pageId: string;
  /** Current (draft) title, shown in the panel header. */
  pageTitle: string;
  /** Whether the page is currently published — drives the unpublished notice. */
  published: boolean;
  /** Working draft values. */
  values: CmsPageDraftValues;
  /** Live/published values — the per-field dirty-comparison baseline. */
  baseline: CmsPageDraftValues;
  /** Route every edit through here so a Phase 2 live-patch path can hook in. */
  onChange: (patch: Partial<CmsPageDraftValues>) => void;
  /** Freeze inputs while publish/discard is settling (edits would race it). */
  disabled?: boolean;
  /** Close the panel (deselect the active page). */
  onClose: () => void;
  /** Link to the full page editor in Site Admin (opened in a new tab). */
  adminHref: string;
  /** "page" for CMS pages, "blog" for blog posts. */
  kind: "page" | "blog";
};

function ModifiedBadge() {
  return (
    <Badge variant="outline" className="text-xs font-normal">
      Modified
    </Badge>
  );
}

/**
 * Right-hand contextual editor for a page or blog post (About, Contact,
 * generic pages, etc.) selected from the visual editor. Mirrors `FieldPanel`'s
 * chrome so the two panels are visually interchangeable in the editor
 * shell. Content editing reuses the same `MinimalTiptapEditor` + S3 uploader
 * pair as `/admin` so owners get identical richtext capabilities here.
 */
export function CmsPagePanel({
  pageId,
  pageTitle,
  published,
  values,
  baseline,
  onChange,
  disabled = false,
  onClose,
  adminHref,
  kind,
}: CmsPagePanelProps) {
  const isBlog = kind === "blog";
  const titleModified = values.title !== baseline.title;
  const excerptModified = (values.excerpt ?? "") !== (baseline.excerpt ?? "");
  const contentModified =
    stableStringify(values.content) !== stableStringify(baseline.content);

  const contentValue = (values.content ??
    EMPTY_TIPTAP_DOC) as unknown as Content;

  return (
    <aside className="bg-card animate-in slide-in-from-right-8 fade-in flex w-[380px] shrink-0 flex-col border-l duration-200">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {pageTitle || (isBlog ? "Untitled post" : "Untitled page")}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {isBlog ? "Blog post" : "Page"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Close page editor"
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
        // inputs — see FieldPanel for the same rationale.
        inert={disabled || undefined}
        className={cn(
          "flex-1 space-y-5 overflow-y-auto px-4 py-4",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        {!published && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            This {isBlog ? "post" : "page"} is unpublished — visitors can&apos;t
            see it. You&apos;re viewing it in preview.
          </div>
        )}

        <div className="space-y-2">
          <Label
            htmlFor={`cms-page-title-${pageId}`}
            className="flex items-center gap-2"
          >
            Title
            {titleModified && <ModifiedBadge />}
          </Label>
          <Input
            id={`cms-page-title-${pageId}`}
            value={values.title}
            disabled={disabled}
            aria-invalid={values.title.trim() === "" || undefined}
            onChange={(event) => onChange({ title: event.target.value })}
          />
          {values.title.trim() === "" && (
            <p className="text-destructive text-xs">
              A title is required — changes can&apos;t be saved without one.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label
            htmlFor={`cms-page-excerpt-${pageId}`}
            className="flex items-center gap-2"
          >
            Excerpt
            {excerptModified && <ModifiedBadge />}
          </Label>
          <Textarea
            id={`cms-page-excerpt-${pageId}`}
            value={values.excerpt ?? ""}
            disabled={disabled}
            rows={3}
            onChange={(event) =>
              onChange({
                excerpt: event.target.value === "" ? null : event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Content
            {contentModified && <ModifiedBadge />}
          </Label>
          {/* Keyed on pageId so switching pages remounts the editor instead
           * of diffing controlled TipTap JSON across unrelated documents. */}
          {/* TODO: this instance passes no galleriesEnabled/embedsEnabled/
           * quotesEnabled prop, so those widgets default to enabled here
           * regardless of the business's actual feature flags — a
           * pre-existing shared gap (not new for quotesEnabled). */}
          <MinimalTiptapEditor
            key={pageId}
            value={contentValue}
            onChange={(content) => onChange({ content })}
            output="json"
            placeholder="Start writing…"
            editable={!disabled}
            className="w-full"
            editorClassName="focus:outline-hidden"
            uploader={uploadRichTextImage}
          />
        </div>

        <div className="border-t pt-4">
          <p className="text-muted-foreground text-xs">
            {isBlog
              ? "Slug, hero image, SEO and publish settings are managed in"
              : "Slug, SEO and publish settings are managed in"}{" "}
            <a
              href={adminHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2"
            >
              Site Admin
            </a>
            .
          </p>
        </div>
      </div>
    </aside>
  );
}
