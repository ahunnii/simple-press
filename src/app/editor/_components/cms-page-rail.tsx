"use client";

import Link from "next/link";
import { FileText } from "lucide-react";

import { cn } from "~/lib/utils";

export type CmsPageRailProps = {
  pageTitle: string;    // the CMS page's title
  adminHref: string;    // /admin/content/pages/<id>
  isActive: boolean;    // whether the content panel is currently open
  onSelect: () => void; // open the content panel
};

/**
 * Right rail for editing CMS page content — allows selecting
 * to open the content panel and links to page-level settings
 * (slug, SEO, publish state) in the admin interface.
 */
export function CmsPageRail({
  pageTitle,
  adminHref,
  isActive,
  onSelect,
}: CmsPageRailProps) {
  return (
    <nav
      aria-label="Page content"
      className="bg-card flex w-60 shrink-0 flex-col overflow-y-auto border-l"
    >
      <div className="flex flex-1 flex-col py-1">
        <p className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
          Page
        </p>
        <div className="space-y-0.5 pb-1">
          <button
            type="button"
            title={pageTitle}
            aria-current={isActive ? "true" : undefined}
            onClick={onSelect}
            className={cn(
              "group relative mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
              isActive
                ? "bg-muted font-medium"
                : "hover:bg-muted/60",
            )}
          >
            {isActive && (
              <span
                className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-full"
                aria-hidden="true"
              />
            )}
            <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">Page content</span>
          </button>
        </div>
      </div>

      <div className="border-t py-1 pb-2">
        <p className="text-muted-foreground px-3 pt-3 pb-1.5 text-xs leading-relaxed">
          Slug, SEO and publish settings are managed in Site Admin.
        </p>
        <Link
          href={adminHref}
          target="_blank"
          rel="noopener noreferrer"
          title="Open page settings in Site Admin"
          className="text-muted-foreground hover:text-foreground hover:bg-muted/60 mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors"
        >
          <span className="min-w-0 flex-1 truncate">Open page settings</span>
        </Link>
      </div>
    </nav>
  );
}
