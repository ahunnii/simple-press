import type { ReactNode } from "react";

import type { GloveBreadcrumbItem } from "../shared";
import { cn } from "~/lib/utils";

import { GloveBreadcrumb, GloveContainer, GloveTitleBand } from "../shared";

type GloveGeneralLayoutProps = {
  /** The page's only h1 (rendered in the navy band). */
  title: string;
  /** Field key when `title` is exactly one field's value (live-text patch). */
  titleFieldKey?: string;
  /** Optional line under the title. */
  subtitle?: string;
  subtitleFieldKey?: string;
  /** Home / ... trail shown on a hairline row under the band. */
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
 * Glove's generic page base: navy title band (the WoodMart page-title
 * convention) + optional breadcrumb row + body. The GenericPage, Blog, Blog
 * post and the optional Events / Videos / Donate / FAQ pages all sit on this
 * so they share one band, one container and one type scale (baseline B1.2).
 */
export function GloveGeneralLayout({
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
        title={title}
        titleFieldKey={titleFieldKey}
        subtitle={subtitle}
        subtitleFieldKey={subtitleFieldKey}
        sectionAttrs={sectionAttrs}
      >
        {bandChildren}
      </GloveTitleBand>
      {breadcrumb && breadcrumb.length > 0 ? (
        <div className="border-b border-[var(--glove-line)] bg-[var(--glove-paper)] py-3">
          <GloveContainer>
            <GloveBreadcrumb items={breadcrumb} />
          </GloveContainer>
        </div>
      ) : null}
      {children}
    </div>
  );
}
