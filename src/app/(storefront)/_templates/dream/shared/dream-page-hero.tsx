import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { DreamClouds } from "./dream-clouds";
import { DreamH1 } from "./dream-h1";

type DreamPageHeroProps = {
  logoUrl: string;
  logoAlt: string;
  title: string;
  accent?: string;
  lede: string;
  titleFieldKey?: string;
  accentFieldKey?: string;
  ledeFieldKey?: string;
  /** Spread on the section root for the preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
  children?: React.ReactNode;
  className?: string;
};

/**
 * Interior-page hero: `<DreamClouds variant="page">` behind a centered
 * logo, h1 with the one-word script accent, and a lede — used by
 * about/services/quote/testimonials/service pages (design.md shared
 * inventory + "Per-page section concepts"). Server component: callers
 * resolve the business logo (via `resolveLogoAlt`) and copy fields before
 * rendering this.
 */
export function DreamPageHero({
  logoUrl,
  logoAlt,
  title,
  accent,
  lede,
  titleFieldKey,
  accentFieldKey,
  ledeFieldKey,
  sectionAttrs,
  children,
  className,
}: DreamPageHeroProps) {
  return (
    <section
      {...sectionAttrs}
      className={cn("dream-page-hero", className)}
      aria-label={title}
    >
      <DreamClouds variant="page" className="dream-page-hero-clouds" />
      <div className="dream-page-hero-content">
        <img
          src={logoUrl}
          alt={logoAlt}
          className="dream-page-hero-logo"
          decoding="async"
          fetchPriority="high"
        />
        <DreamH1
          accent={accent}
          fieldKey={titleFieldKey}
          accentFieldKey={accentFieldKey}
        >
          {title}
        </DreamH1>
        {lede ? (
          <p
            className="dream-page-hero-lede"
            {...(ledeFieldKey ? fieldAttr(ledeFieldKey) : {})}
          >
            {lede}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}
