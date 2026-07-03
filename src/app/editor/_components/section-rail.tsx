"use client";

import { ChevronRight } from "lucide-react";

import type { TemplateSection } from "~/lib/template-sections";
import { cn } from "~/lib/utils";

export type SectionRailProps = {
  /** Sections belonging to the active page, already in template order. */
  sections: TemplateSection[];
  /** Site-wide sections (`page === "global"`), shown pinned at the bottom. */
  globalSections: TemplateSection[];
  /** Currently open section id, or null when the panel is closed. */
  activeSectionId: string | null;
  /** Fired when a section row is chosen. */
  onSelectSection: (section: TemplateSection) => void;
};

function SectionRow({
  section,
  isActive,
  onSelect,
}: {
  section: TemplateSection;
  isActive: boolean;
  onSelect: (section: TemplateSection) => void;
}) {
  return (
    <button
      type="button"
      title={section.description ?? undefined}
      aria-current={isActive ? "true" : undefined}
      onClick={() => onSelect(section)}
      className={cn(
        "group relative mx-2 flex w-[calc(100%-1rem)] items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
        isActive
          ? "bg-muted text-foreground font-medium"
          : "text-foreground hover:bg-muted/60",
      )}
    >
      {isActive && (
        <span
          className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full"
          aria-hidden="true"
        />
      )}
      <span className="min-w-0 truncate">
        {section.title}
        {section.description && (
          <span className="sr-only"> — {section.description}</span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {/* Reserved for a future per-section visibility (eye) toggle. */}
        {section.hideable && <span className="h-4 w-4" aria-hidden="true" />}
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 transition-opacity",
            isActive ? "opacity-100" : "opacity-40 group-hover:opacity-70",
          )}
          aria-hidden="true"
        />
      </span>
    </button>
  );
}

/**
 * Left rail listing the active page's sections, plus a pinned "Site-wide"
 * group for global (header/footer/announcement) sections. Selecting a row
 * opens it in the field panel and scrolls the preview to it.
 */
export function SectionRail({
  sections,
  globalSections,
  activeSectionId,
  onSelectSection,
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
                onSelect={onSelectSection}
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
              onSelect={onSelectSection}
            />
          ))}
        </div>
      )}
    </nav>
  );
}
