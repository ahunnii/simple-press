"use client";

import Link from "next/link";
import {
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Palette,
  Wrench,
} from "lucide-react";

import type { TemplateSection } from "~/lib/template-sections";
import { cn } from "~/lib/utils";
import { EDITOR_ADMIN_LINKS } from "~/app/editor/_lib/editor-admin-links";

export type SectionRailProps = {
  /** Sections belonging to the active page, already in template order. */
  sections: TemplateSection[];
  /** Site-wide sections (`page === "global"`), shown pinned at the bottom. */
  globalSections: TemplateSection[];
  /** Currently open section id, or null when the panel is closed. */
  activeSectionId: string | null;
  /** Section ids currently hidden on the storefront (draft state). */
  hiddenSectionIds: ReadonlySet<string>;
  /** Fired when a section row is chosen. */
  onSelectSection: (section: TemplateSection) => void;
  /** Fired when a hideable section's eye toggle is clicked. */
  onToggleVisibility: (section: TemplateSection) => void;
  /** Whether this template has curated theme presets. */
  hasTheme: boolean;
  /** Whether the theme panel is currently open. */
  themeActive: boolean;
  /** Fired when the Theme entry is chosen. */
  onSelectTheme: () => void;
  /** True for PLATFORM_ADMIN users — shows the pinned "Advanced editor" link. */
  isPlatformAdmin?: boolean;
};

/** Shared with `CmsPageRail` for the blog-post "Article sections" group. */
export function SectionRow({
  section,
  isActive,
  isHidden,
  onSelect,
  onToggleVisibility,
}: {
  section: TemplateSection;
  isActive: boolean;
  isHidden: boolean;
  onSelect: (section: TemplateSection) => void;
  onToggleVisibility: (section: TemplateSection) => void;
}) {
  return (
    <div
      className={cn(
        "group relative mx-2 flex w-[calc(100%-1rem)] items-center rounded-md transition-colors",
        isActive ? "bg-muted" : "hover:bg-muted/60",
      )}
    >
      {isActive && (
        <span
          className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full"
          aria-hidden="true"
        />
      )}
      <button
        type="button"
        title={section.description ?? undefined}
        aria-current={isActive ? "true" : undefined}
        onClick={() => onSelect(section)}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left text-sm"
      >
        <span
          className={cn(
            "min-w-0 truncate",
            isActive && "font-medium",
            isHidden && "text-muted-foreground",
          )}
        >
          {section.title}
          {isHidden && <span className="sr-only"> (hidden on your site)</span>}
          {section.description && (
            <span className="sr-only"> — {section.description}</span>
          )}
        </span>
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 transition-opacity",
            isActive ? "opacity-100" : "opacity-40 group-hover:opacity-70",
          )}
          aria-hidden="true"
        />
      </button>
      {section.hideable && (
        <button
          type="button"
          aria-label={
            isHidden ? `Show "${section.title}"` : `Hide "${section.title}"`
          }
          aria-pressed={isHidden}
          title={isHidden ? "Hidden — click to show" : "Shown — click to hide"}
          onClick={() => onToggleVisibility(section)}
          className={cn(
            "text-muted-foreground hover:text-foreground mr-1.5 shrink-0 rounded p-1 transition-opacity",
            // Always visible when hidden (it's load-bearing state); appears
            // on hover/focus otherwise.
            isHidden
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          {isHidden ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Left rail listing the active page's sections, plus a pinned "Site-wide"
 * group for global (header/footer/announcement) sections. Selecting a row
 * opens it in the field panel and scrolls the preview to it. Hideable
 * sections get an eye toggle; hidden rows dim but stay editable.
 */
export function SectionRail({
  sections,
  globalSections,
  activeSectionId,
  hiddenSectionIds,
  onSelectSection,
  onToggleVisibility,
  hasTheme,
  themeActive,
  onSelectTheme,
  isPlatformAdmin,
}: SectionRailProps) {
  return (
    <nav
      aria-label="Page sections"
      className="bg-card flex w-60 shrink-0 flex-col overflow-y-auto border-r"
    >
      <div className="flex flex-1 flex-col py-1">
        <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
          Sections
        </p>
        {sections.length === 0 ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center px-4 py-8 text-center text-sm">
            No editable sections on this page.
          </div>
        ) : (
          <div className="space-y-0.5 pb-1">
            {sections.map((section) => (
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
      </div>

      {globalSections.length > 0 && (
        <div className="space-y-0.5 border-t py-1 pb-2">
          <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
            Site-wide
          </p>
          {globalSections.map((section) => (
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
        <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
          In your admin
        </p>
        <div className="space-y-0.5">
          {EDITOR_ADMIN_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors"
            >
              <span className="min-w-0 flex-1 truncate">{link.label}</span>
              <ExternalLink
                className="text-muted-foreground h-3 w-3 shrink-0"
                aria-hidden="true"
              />
            </a>
          ))}
        </div>
      </div>

      {hasTheme && (
        <div className="border-t py-1 pb-2">
          <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
            Design
          </p>
          <button
            type="button"
            aria-current={themeActive ? "true" : undefined}
            onClick={onSelectTheme}
            className={cn(
              "group relative mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
              themeActive ? "bg-muted font-medium" : "hover:bg-muted/60",
            )}
          >
            {themeActive && (
              <span
                className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full"
                aria-hidden="true"
              />
            )}
            <Palette className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">Theme</span>
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 transition-opacity",
                themeActive
                  ? "opacity-100"
                  : "opacity-40 group-hover:opacity-70",
              )}
              aria-hidden="true"
            />
          </button>
        </div>
      )}

      {isPlatformAdmin && (
        <div className="border-t py-1 pb-2">
          <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
            Platform
          </p>
          <Link
            href="/admin/content/template"
            title="Raw field editor — platform admin only"
            className="text-muted-foreground hover:text-foreground hover:bg-muted/60 mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors"
          >
            <Wrench className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">Advanced editor</span>
          </Link>
        </div>
      )}
    </nav>
  );
}
