import { Fragment } from "react";
import Link from "next/link";

import { cn } from "~/lib/utils";

export type GloveBreadcrumbItem = { label: string; href?: string };

type GloveBreadcrumbProps = {
  items: GloveBreadcrumbItem[];
  className?: string;
};

/** Lato 13px muted trail; the last item is the current page (ink, 700). */
export function GloveBreadcrumb({ items, className }: GloveBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[13px]", className)}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 text-[var(--glove-muted)]">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li>
                {isLast || !item.href ? (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={cn(
                      isLast && "font-bold text-[var(--glove-ink)]",
                    )}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-[var(--glove-primary)]"
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
