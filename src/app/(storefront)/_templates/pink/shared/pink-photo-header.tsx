import Image from "next/image";
import Link from "next/link";

import type { PinkBreadcrumbItem } from "./pink-page-header";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

type PinkPhotoHeaderProps = {
  imageUrl: string;
  imageAlt?: string;
  breadcrumb?: PinkBreadcrumbItem[];
  heading: string;
  headingFieldKey?: string;
  intro?: string;
  introFieldKey?: string;
  /** CSS min-height value — 66vh (about), 62vh (collection), 64vh (service). */
  minHeight?: string;
  /** Optional fact rows rendered on the blurred ink panel below the intro. */
  factRows?: React.ReactNode;
  sectionAttrs?: Record<string, string>;
  className?: string;
};

/**
 * The photographic dark hero: background image + a 90° scrim + a 180° scrim
 * + breadcrumb + eyebrow + H1 + intro + optional fact rows on a blurred ink
 * panel. Used by about, collection detail, and service detail (design.md →
 * Shared component inventory). Server-safe.
 *
 * H1 scale per design.md → Typography: `clamp(2.375rem, 5.6vw, 5.75rem)` / 600 /
 * `-.035em` / `.98`.
 */
export function PinkPhotoHeader({
  imageUrl,
  imageAlt = "",
  breadcrumb,
  heading,
  headingFieldKey,
  intro,
  introFieldKey,
  minHeight = "64vh",
  factRows,
  sectionAttrs,
  className,
}: PinkPhotoHeaderProps) {
  return (
    <header
      className={cn("relative flex items-end overflow-hidden", className)}
      style={{ minHeight, background: "var(--pink-ink)" }}
      {...sectionAttrs}
    >
      {/* No image set → the header stays on bare `--pink-ink` with its scrims.
          The light `/placeholder.svg` would read as a grey slab behind the
          headline on this dark band (same rule as the homepage hero). */}
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : null}
      {/* 90° scrim — darkens the left edge where the text sits */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--pink-ink) 97%, transparent) 0%, color-mix(in srgb, var(--pink-ink) 50%, transparent) 60%, transparent 100%)",
        }}
      />
      {/* 180° scrim — darkens the bottom where the fact-rows panel sits */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--pink-ink) 80%, transparent) 0%, color-mix(in srgb, var(--pink-ink) 25%, transparent) 35%, color-mix(in srgb, var(--pink-ink) 35%, transparent) 60%, color-mix(in srgb, var(--pink-ink) 85%, transparent) 100%)",
        }}
      />

      <div className="relative z-10 w-full px-5 py-14 md:px-10 md:py-16">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
          <div className="flex flex-col gap-4">
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
                        style={{ color: "var(--pink-over-photo)" }}
                      >
                        /
                      </span>
                    )}
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="text-[13px] transition-colors hover:opacity-80"
                        style={{ color: "var(--pink-over-photo)" }}
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className="text-[13px]"
                        style={{ color: "var(--pink-over-photo)" }}
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
                fontSize: "clamp(2.375rem, 5.6vw, 5.75rem)",
                fontWeight: 600,
                letterSpacing: "-0.035em",
                lineHeight: 0.98,
                color: "var(--pink-paper)",
              }}
              {...(headingFieldKey ? fieldAttr(headingFieldKey) : {})}
            >
              {heading}
            </h1>

            {intro && (
              <p
                className="max-w-[48ch] text-[19px] leading-[1.6]"
                style={{ color: "var(--pink-ink-body)" }}
                {...(introFieldKey ? fieldAttr(introFieldKey) : {})}
              >
                {intro}
              </p>
            )}
          </div>

          {factRows && (
            <div
              className="w-fit"
              style={{
                background:
                  "color-mix(in srgb, var(--pink-ink-panel) 86%, transparent)",
                backdropFilter: "blur(6px)",
              }}
            >
              {factRows}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
