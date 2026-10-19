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
  /** Cream/gold trail for black surfaces (collection hero). */
  onBlack?: boolean;
};

/**
 * UmscBreadcrumb — 13px uppercase Work Sans trail. The last item (or any
 * item without `href`) renders as a plain `aria-current="page"` span.
 */
export function UmscBreadcrumb({ items, style, onBlack = false }: Props) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`umsc-sans flex flex-wrap items-center gap-2 text-[13px] font-medium tracking-[0.06em] uppercase ${
        onBlack
          ? "text-[var(--umsc-cream-on-black)]"
          : "text-[var(--umsc-muted)]"
      }`}
      style={style}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${item.label}-${i}`}>
            {isLast || !item.href ? (
              <span
                aria-current={isLast ? "page" : undefined}
                className={
                  onBlack
                    ? "text-[var(--umsc-gold-soft)]"
                    : "text-[var(--umsc-ink)]"
                }
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
              <span
                aria-hidden="true"
                className={
                  onBlack
                    ? "text-[var(--umsc-line-gold)]"
                    : "text-[var(--umsc-line)]"
                }
              >
                /
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
