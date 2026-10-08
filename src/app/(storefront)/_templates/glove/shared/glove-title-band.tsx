import type { ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

type GloveTitleBandProps = {
  title: string;
  /** Field key when `title` is exactly one field's value. */
  titleFieldKey?: string;
  /** Optional line under the title (navy-soft). */
  subtitle?: string;
  subtitleFieldKey?: string;
  /** Tabs, steps or any sub-row rendered under the title. */
  children?: ReactNode;
  /** Spread onto the root `<section>`: `sectionGroupAttr(page, group)`. */
  sectionAttrs?: Record<string, string>;
  className?: string;
  /** Heading level. Default h1; use "p" styling only if an h1 exists elsewhere. */
  as?: "h1" | "h2";
};

/**
 * Navy page-title band: 56px Poppins H1 (36px on phones), optional sub-line
 * and children row. The WoodMart page-title convention, used by Shop,
 * Collections, Blog, Testimonials, Generic and Cart/Checkout.
 */
export function GloveTitleBand({
  title,
  titleFieldKey,
  subtitle,
  subtitleFieldKey,
  children,
  sectionAttrs,
  className,
  as: Tag = "h1",
}: GloveTitleBandProps) {
  return (
    <section
      className={cn(
        "glove-on-dark bg-[var(--glove-navy)] px-[var(--glove-gutter)] py-10 text-center text-white md:py-14",
        className,
      )}
      {...sectionAttrs}
    >
      <div className="glove-container">
        <Tag
          className="glove-display text-[36px] leading-[1.15] font-medium text-white md:text-[56px]"
          {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
        >
          {title}
        </Tag>
        {subtitle ? (
          <p
            className="mx-auto mt-3 max-w-2xl text-base text-[var(--glove-navy-soft)]"
            {...(subtitleFieldKey ? fieldAttr(subtitleFieldKey) : {})}
          >
            {subtitle}
          </p>
        ) : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}
