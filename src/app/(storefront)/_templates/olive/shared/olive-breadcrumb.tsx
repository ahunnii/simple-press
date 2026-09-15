import type { CSSProperties } from "react";
import Link from "next/link";

import { cn } from "~/lib/utils";

export type OliveBreadcrumbItem = {
  label: string;
  /** Omit on the trail's own page. The last item never links regardless. */
  href?: string;
};

type OliveBreadcrumbProps = {
  items: OliveBreadcrumbItem[];
  className?: string;
  style?: CSSProperties;
};

/**
 * OliveBreadcrumb — the trail back up, set in the small tracked label face.
 *
 * An ordered list inside a labelled nav, "/" separators drawn aria-hidden so
 * they are never spoken, and the last item marked `aria-current="page"`
 * instead of linking to where the reader already is.
 */
export function OliveBreadcrumb({
  items,
  className,
  style,
}: OliveBreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={className} style={style}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-2">
              {isLast || !item.href ? (
                <span
                  className="olive-label"
                  style={isLast ? { color: "var(--olive-ink)" } : undefined}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn("olive-label", "hover:underline")}
                  style={{ textUnderlineOffset: "4px" }}
                >
                  {item.label}
                </Link>
              )}
              {isLast ? null : (
                <span className="olive-label" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
