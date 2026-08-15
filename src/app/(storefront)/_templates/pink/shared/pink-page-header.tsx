import Link from "next/link";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

export type PinkBreadcrumbItem = { label: string; href?: string };

type PinkPageHeaderProps = {
  breadcrumb?: PinkBreadcrumbItem[];
  heading: string;
  headingFieldKey?: string;
  intro?: string;
  introFieldKey?: string;
  /** Optional right-hand slot — fact rows, stat tiles, or a count pair. */
  rightSlot?: React.ReactNode;
  sectionAttrs?: Record<string, string>;
  className?: string;
};

/**
 * The flat interior-page header: breadcrumb → H1 → intro,
 * with an optional right-hand slot. Used by shop, collections, blog,
 * contact, testimonials, services and generic pages (design.md → Shared
 * component inventory). Server-safe.
 *
 * H1 scale per design.md → Typography: `clamp(2.125rem, 4.6vw, 3.875rem)` / 600 /
 * `-.03em` / `1.0–1.02`.
 */
export function PinkPageHeader({
  breadcrumb,
  heading,
  headingFieldKey,
  intro,
  introFieldKey,
  rightSlot,
  sectionAttrs,
  className,
}: PinkPageHeaderProps) {
  return (
    <header
      // Light as of 2026-07-31. This component is on 8 interior routes, so a
      // dark band here meant almost every page opened with a full-bleed black
      // slab — the opposite of "black used selectively". Black is now reserved
      // for the homepage events band and the footer. A hairline under the
      // header keeps it separated from the page body without a filled slab.
      className={cn("px-5 py-16 md:px-10 md:py-20", className)}
      style={{
        background: "var(--pink-paper)",
        color: "var(--pink-ink)",
        borderBottom: "1px solid var(--pink-line)",
      }}
      {...sectionAttrs}
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 md:flex-row md:items-end md:justify-between">
        {/* `basis` + `min-w` keep the headline column readable. Without a floor
            a wide `rightSlot` (e.g. the 4-up stat tiles on /services) squeezed
            this column to ~90px and the heading wrapped one word per line. */}
        <div className="flex min-w-0 flex-col gap-4 md:min-w-[360px] md:basis-[52%]">
          {breadcrumb && breadcrumb.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5"
            >
              {breadcrumb.map((crumb, i) => (
                <span
                  key={crumb.label + i}
                  className="flex items-center gap-1.5"
                >
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      style={{ color: "var(--pink-subtle)" }}
                    >
                      /
                    </span>
                  )}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-[13px] transition-colors hover:opacity-80"
                      style={{ color: "var(--pink-subtle)" }}
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className="text-[13px]"
                      style={{ color: "var(--pink-subtle)" }}
                    >
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          )}

          <h1
            className="pink-display"
            style={{
              fontSize: "clamp(2.125rem, 4.6vw, 3.875rem)",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              lineHeight: 1.02,
            }}
            {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
          >
            {heading}
          </h1>

          {intro && (
            <p
              className="max-w-[46ch] text-[17px] leading-[1.7]"
              style={{ color: "var(--pink-body)" }}
              {...(introFieldKey ? fieldAttr(introFieldKey) : {})}
            >
              {intro}
            </p>
          )}
        </div>

        {rightSlot && <div className="min-w-0 md:max-w-[46%]">{rightSlot}</div>}
      </div>
    </header>
  );
}
