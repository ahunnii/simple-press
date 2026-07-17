import type { CSSProperties } from "react";
import { Fragment } from "react";
import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  /** When omitted the item renders as the current-page span (no link). */
  href?: string;
};

export type ViiBreadcrumbProps = {
  /**
   * Ordered breadcrumb items. The last item always renders as the current-page
   * span (aria-current="page"), regardless of whether href is supplied, since
   * linking to the current page is redundant. Intermediate items without href
   * render as plain spans without aria-current.
   */
  items: BreadcrumbItem[];
  /**
   * Extra styles merged onto the <nav> element.
   * Call-site notes:
   *   vii-collection-page.tsx adds marginBottom: 20 (line 43)
   *   vii-product-page.tsx    uses padding on the nav itself instead (line 155)
   */
  style?: CSSProperties;
};

/**
 * ViiBreadcrumb — shared Skinbar VII breadcrumb navigation.
 *
 * Reproduces the breadcrumb nav from vii-collection-page.tsx (lines 38-86).
 * The vii-product-page.tsx nav (lines 147-191) uses the same visual treatment
 * but with simpler link inline styles (no paddingBlock / marginBlock tap target
 * expansion) and flexWrap. Both variants are served by this component; the
 * collection-page link style (larger tap target) is used here as the default
 * since it is the canonical reference per the component spec.
 *
 * Items with `href` → Next.js Link with .vii-nav-link hover-underline class.
 * Last item or items without `href` → <span aria-current="page"> in navy.
 * Items are separated by a "/" divider rendered aria-hidden.
 */
export function ViiBreadcrumb({ items, style }: ViiBreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-sans)",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--vii-ink-soft)",
        ...style,
      }}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;

        return (
          <Fragment key={`crumb-${i}`}>
            {isLast || !item.href ? (
              <span
                aria-current={isLast ? "page" : undefined}
                style={{ color: "var(--vii-navy)" }}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="vii-nav-link"
                style={{
                  position: "relative",
                  color: "inherit",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  paddingBlock: 8,
                  marginBlock: -8,
                }}
              >
                {item.label}
              </Link>
            )}
            {!isLast && <span aria-hidden="true">/</span>}
          </Fragment>
        );
      })}
    </nav>
  );
}
