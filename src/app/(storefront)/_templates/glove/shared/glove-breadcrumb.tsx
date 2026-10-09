import { Fragment } from "react";
import Link from "next/link";

import { cn } from "~/lib/utils";

export type GloveBreadcrumbItem = { label: string; href?: string };

type GloveBreadcrumbProps = {
  items: GloveBreadcrumbItem[];
  /**
   * `light` (default): muted trail on paper. `onDark`: lavender trail inside
   * a plum title band, current page in white, links underline white on hover.
   */
  tone?: "light" | "onDark";
  className?: string;
};

/** Lato 13px trail; the last item is the current page (700 weight). */
export function GloveBreadcrumb({
  items,
  tone = "light",
  className,
}: GloveBreadcrumbProps) {
  const onDark = tone === "onDark";
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[13px]", className)}>
      <ol
        className={cn(
          "m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0",
          onDark
            ? "text-[var(--glove-on-plum-soft)]"
            : "text-[var(--glove-muted)]",
        )}
      >
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li>
                {isLast || !item.href ? (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={cn(
                      isLast &&
                        (onDark
                          ? "font-bold text-white"
                          : "font-bold text-[var(--glove-ink)]"),
                    )}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "transition-colors",
                      onDark
                        ? "underline-offset-4 hover:text-white hover:underline"
                        : "hover:text-[var(--glove-primary)]",
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
              {!isLast && (
                <li aria-hidden="true" className="select-none">
                  /
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
