"use client";

import { Search } from "lucide-react";

import { cn } from "~/lib/utils";

import { useSiteSearch } from "./site-search-context";

export type SiteSearchButtonProps = {
  /** Classes for the <button> — pass the header's own icon-button classes. */
  className?: string;
  /** Classes for the lucide icon (size, etc.). Defaults to `h-5 w-5`. */
  iconClassName?: string;
  /** Icon stroke width; lucide's default (2) when omitted. */
  strokeWidth?: number;
  /** Visible text next to the icon. Omitted ⇒ icon-only, aria-label "Search". */
  label?: string;
  /**
   * Replaces the default icon (+ label) inside the button, for headers with a
   * bespoke search glyph. For an existing <a>/<button> you'd rather keep as
   * is, use `useSiteSearch()` instead (see the barrel docs).
   */
  children?: React.ReactNode;
};

/**
 * Header search trigger. Renders nothing unless the `siteSearch` flag is on
 * (and a `SiteSearchProvider` is mounted — the storefront layout does that).
 * Colours come from `currentColor`, so it inherits the header's link colour.
 */
export function SiteSearchButton({
  className,
  iconClassName,
  strokeWidth,
  label,
  children,
}: SiteSearchButtonProps) {
  const search = useSiteSearch();
  if (!search.enabled) return null;

  return (
    <button
      type="button"
      aria-label={label ? undefined : "Search"}
      aria-haspopup="dialog"
      aria-expanded={search.isOpen}
      aria-keyshortcuts="/ Control+K Meta+K"
      data-sp-search-trigger=""
      onClick={(e) => search.open({ trigger: e.currentTarget })}
      onPointerEnter={search.prefetch}
      onFocus={search.prefetch}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2",
        className,
      )}
    >
      {children ?? (
        <>
          <Search
            className={iconClassName ?? "h-5 w-5"}
            strokeWidth={strokeWidth}
            aria-hidden="true"
          />
          {label ? <span>{label}</span> : null}
        </>
      )}
    </button>
  );
}
