import type { CSSProperties } from "react";
import { Fragment } from "react";
import Link from "next/link";

export type UmscBreadcrumbItem = {
  label: string;
  /** Omitted on the last item — linking to the current page is redundant. */
  href?: string;
};

type Props = {
  items: UmscBreadcrumbItem[];
  style?: CSSProperties;
};

/**
 * UmscBreadcrumb — 13px uppercase Work Sans trail. The last item (or any
 * item without `href`) renders as a plain `aria-current="page"` span.
 */
export function UmscBreadcrumb({ items, style }: Props) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="umsc-sans flex flex-wrap items-center gap-2 text-[13px] font-medium tracking-[0.06em] text-[var(--umsc-muted)] uppercase"
      style={style}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${item.label}-${i}`}>
            {isLast || !item.href ? (
              <span
                aria-current={isLast ? "page" : undefined}
                className="text-[var(--umsc-ink)]"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="umsc-nav-link -my-2 inline-flex items-center py-2 text-inherit no-underline"
              >
                {item.label}
              </Link>
            )}
            {!isLast && (
              <span aria-hidden="true" className="text-[var(--umsc-line)]">
                /
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
