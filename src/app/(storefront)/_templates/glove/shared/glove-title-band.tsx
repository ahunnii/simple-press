"use client";

import type { ReactNode } from "react";
import Image from "next/image";

import type { GloveBreadcrumbItem } from "./glove-breadcrumb";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { GloveBreadcrumb } from "./glove-breadcrumb";
import { useGlovePageBanner } from "./glove-page-banner";

export type GloveTitleBandVariant = "banner" | "plum";

type GloveTitleBandProps = {
  /**
   * `banner`: her branded page-banner art behind a plum scrim (browse pages).
   * `plum`: a compact solid deep-plum band (account, cart, checkout, detail
   * pages). Required so every page picks one on purpose.
   */
  variant: GloveTitleBandVariant;
  title: string;
  /** Field key when `title` is exactly one field's value. */
  titleFieldKey?: string;
  /** Optional line under the title (lavender on plum). */
  subtitle?: string;
  subtitleFieldKey?: string;
  /** Home / ... trail, rendered small above the title inside the band. */
  breadcrumb?: GloveBreadcrumbItem[];
  /** Any sub-row rendered under the title (dates, meta). */
  children?: ReactNode;
  /** Spread onto the root `<section>`: `sectionGroupAttr(page, group)`. */
  sectionAttrs?: Record<string, string>;
  className?: string;
  /** Heading level. Default h1. */
  as?: "h1" | "h2";
};

/**
 * Glove's page-title band. Left-aligned in the 1222px container: breadcrumb,
 * then a 40px Poppins title (30px on phones), then an optional sub-line and
 * children row. Each variant has one fixed minimum height (`.glove-band--*`
 * in globals.css) so the band never drifts page to page.
 */
export function GloveTitleBand({
  variant,
  title,
  titleFieldKey,
  subtitle,
  subtitleFieldKey,
  breadcrumb,
  children,
  sectionAttrs,
  className,
  as: Tag = "h1",
}: GloveTitleBandProps) {
  const bannerSrc = useGlovePageBanner();
  return (
    <section
      className={cn(
        "glove-band glove-on-dark",
        variant === "banner" ? "glove-band--banner" : "glove-band--plum",
        className,
      )}
      {...sectionAttrs}
    >
      {variant === "banner" ? (
        <>
          <Image
            src={bannerSrc}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-right"
          />
          <div aria-hidden="true" className="glove-band__scrim" />
        </>
      ) : null}
      <div className="glove-container relative">
        <div className="glove-band__copy">
          {breadcrumb && breadcrumb.length > 0 ? (
            <GloveBreadcrumb
              items={breadcrumb}
              tone="onDark"
              className="mb-2 md:mb-3"
            />
          ) : null}
          <Tag
            className="glove-display m-0 text-[30px] leading-[1.2] font-medium tracking-[-0.01em] text-white md:text-[40px]"
            {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
          >
            {title}
          </Tag>
          {subtitle ? (
            <p
              className="mt-2 mb-0 max-w-[56ch] text-[15px] leading-relaxed text-[var(--glove-on-plum-soft)] md:mt-3 md:text-base"
              {...(subtitleFieldKey ? fieldAttr(subtitleFieldKey) : {})}
            >
              {subtitle}
            </p>
          ) : null}
          {children ? <div className="mt-2">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
