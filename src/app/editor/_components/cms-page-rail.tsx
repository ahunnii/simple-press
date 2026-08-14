"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

import type { TemplateSection } from "~/lib/template-sections";
import { cn } from "~/lib/utils";

import { SectionRow } from "./section-rail";

export type CmsPageRailProps = {
  pageTitle: string; // the CMS page's title
  adminHref: string; // /admin/content/pages/<id>
  isActive: boolean; // whether the content panel is currently open
  onSelect: () => void; // open the content panel
  kind: "page" | "blog"; // "page" for CMS pages, "blog" for blog posts
  /** Template sections that render on individual blog posts (blog kind only). */
  sections?: TemplateSection[];
  /** Site-wide sections (`page === "global"`), shown above the settings footer. */
  globalSections?: TemplateSection[];
  /** Currently open section id, or null when no field panel is open. */
  activeSectionId?: string | null;
  /** Section ids currently hidden on the storefront (draft state). */
  hiddenSectionIds?: ReadonlySet<string>;
  /** Fired when a section row is chosen. */
  onSelectSection?: (section: TemplateSection) => void;
  /** Fired when a hideable section's eye toggle is clicked. */
  onToggleVisibility?: (section: TemplateSection) => void;
};

/**
 * Right rail for editing CMS page content — allows selecting
 * to open the content panel and links to page-level settings
 * (slug, SEO, publish state) in the admin interface.
 *
 * While previewing a blog post it also lists the template sections that
 * render on individual posts ("Article sections" — e.g. the end-of-article
 * CTA) plus the site-wide sections, so they stay editable in place.
 */
export function CmsPageRail({
  pageTitle,
  adminHref,
  isActive,
  onSelect,
  kind,
  sections,
  globalSections,
  activeSectionId = null,
  hiddenSectionIds,
  onSelectSection,
  onToggleVisibility,
}: CmsPageRailProps) {
  const isBlog = kind === "blog";
  // Section rows only make sense on a blog post preview, and only when the
  // owner (VisualEditor) wired the handlers — page-kind usage stays as-is.
  const canEditSections =
    isBlog && !!onSelectSection && !!onToggleVisibility && !!hiddenSectionIds;
  const articleSections = canEditSections ? (sections ?? []) : [];
  const siteWideSections = canEditSections ? (globalSections ?? []) : [];
  const sectionLabel = isBlog ? "Blog post" : "Page";
  const navLabel = isBlog ? "Post content" : "Page content";
  const settingsLabel = isBlog ? "Open post settings" : "Open page settings";

  return (
    <nav
      aria-label={navLabel}
      className="bg-card flex w-60 shrink-0 flex-col overflow-y-auto border-l"
    >
      <div className="flex flex-1 flex-col py-1">
        <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
          {sectionLabel}
        </p>
        <div className="space-y-0.5 pb-1">
          <button
            type="button"
            title={pageTitle}
            aria-current={isActive ? "true" : undefined}
            onClick={onSelect}
            className={cn(
              "group relative mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
              isActive ? "bg-muted font-medium" : "hover:bg-muted/60",
            )}
          >
            {isActive && (
              <span
                className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full"
                aria-hidden="true"
              />
            )}
            <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{navLabel}</span>
          </button>
        </div>

        {onSelectSection &&
          onToggleVisibility &&
          hiddenSectionIds &&
          articleSections.length > 0 && (
            <>
              <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
                Article sections
              </p>
              <div className="space-y-0.5 pb-1">
                {articleSections.map((section) => (
                  <SectionRow
                    key={section.id}
                    section={section}
                    isActive={section.id === activeSectionId}
                    isHidden={hiddenSectionIds.has(section.id)}
                    onSelect={onSelectSection}
                    onToggleVisibility={onToggleVisibility}
                  />
                ))}
              </div>
            </>
          )}
      </div>

      {onSelectSection &&
        onToggleVisibility &&
        hiddenSectionIds &&
        siteWideSections.length > 0 && (
          <div className="space-y-0.5 border-t py-1 pb-2">
            <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
              Site-wide
            </p>
            {siteWideSections.map((section) => (
              <SectionRow
                key={section.id}
                section={section}
                isActive={section.id === activeSectionId}
                isHidden={hiddenSectionIds.has(section.id)}
                onSelect={onSelectSection}
                onToggleVisibility={onToggleVisibility}
              />
            ))}
          </div>
        )}

      <div className="border-t py-1 pb-2">
        <p className="text-muted-foreground px-3 pt-3 pb-1.5 text-xs leading-relaxed">
          {isBlog
            ? "Slug, hero image, SEO and publish settings are managed in Site Admin."
            : "Slug, SEO and publish settings are managed in Site Admin."}
        </p>
        <Link
          href={adminHref}
          target="_blank"
          rel="noopener noreferrer"
          title={`${settingsLabel} in Site Admin`}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/60 mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors"
        >
          <span className="min-w-0 flex-1 truncate">{settingsLabel}</span>
        </Link>
      </div>
    </nav>
  );
}
