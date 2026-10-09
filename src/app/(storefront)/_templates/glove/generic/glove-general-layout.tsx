import type { ReactNode } from "react";

import type { GloveBreadcrumbItem, GloveTitleBandVariant } from "../shared";
import { cn } from "~/lib/utils";

import { GloveTitleBand } from "../shared";

type GloveGeneralLayoutProps = {
  /**
   * `banner` for browse pages (her banner art), `plum` for detail pages with
   * long titles or meta rows. Required so every page chooses on purpose.
   */
  bandVariant: GloveTitleBandVariant;
  /** The page's only h1 (rendered in the title band). */
  title: string;
  /** Field key when `title` is exactly one field's value (live-text patch). */
  titleFieldKey?: string;
  /** Optional line under the title. */
  subtitle?: string;
  subtitleFieldKey?: string;
  /** Home / ... trail, shown small above the title inside the band. */
  breadcrumb?: GloveBreadcrumbItem[];
  /** Spread on the band `<section>` (editor hotspot for the hero group). */
  sectionAttrs?: Record<string, string>;
  /**
   * Spread on a wrapping `<div>` around band + body, for pages whose single
   * field group owns the whole page (FAQ). Mutually useful with, not instead
   * of, `sectionAttrs`: pass only one of the two for the same group.
   */
  rootAttrs?: Record<string, string>;
  /** Extra row inside the band under the subtitle (dates, meta). */
  bandChildren?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * Glove's generic page base: title band (breadcrumb inside it) + body. The
 * GenericPage, Blog, Blog post and the optional Events / Videos / Donate /
 * FAQ / Services pages all sit on this so they share one band, one container
 * and one type scale (baseline B1.2).
 */
export function GloveGeneralLayout({
  bandVariant,
  title,
  titleFieldKey,
  subtitle,
  subtitleFieldKey,
  breadcrumb,
  sectionAttrs,
  rootAttrs,
  bandChildren,
  className,
  children,
}: GloveGeneralLayoutProps) {
  return (
    <div className={cn("glove-body", className)} {...rootAttrs}>
      <GloveTitleBand
        variant={bandVariant}
        title={title}
        titleFieldKey={titleFieldKey}
        subtitle={subtitle}
        subtitleFieldKey={subtitleFieldKey}
        breadcrumb={breadcrumb}
        sectionAttrs={sectionAttrs}
      >
        {bandChildren}
      </GloveTitleBand>
      {children}
    </div>
  );
}
