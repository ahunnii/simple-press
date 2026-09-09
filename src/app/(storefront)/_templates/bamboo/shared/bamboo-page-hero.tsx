/* eslint-disable @next/next/no-img-element */
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { FadeIn } from "~/components/page-animations";

type Props = {
  /** Uppercase gold kicker above the headline. Omit for no eyebrow. */
  eyebrow?: string;
  /** Decorative lucide glyph rendered inline before the eyebrow text. */
  eyebrowIcon?: LucideIcon;
  /** Set when the eyebrow is a live-patchable text field. */
  eyebrowFieldKey?: string;
  title: ReactNode;
  /** Set when the title is a live-patchable text field. */
  titleFieldKey?: string;
  lede?: string | null;
  /** Set when the lede is a live-patchable text field. */
  ledeFieldKey?: string;
  /** Arch portrait URL. Null/undefined renders the text-only variant. */
  image?: string | null;
  imagePriority?: boolean;
  /** Spread of `sectionGroupAttr(...)` for the preview overlay. */
  sectionAttrs?: Record<string, string>;
  /** Extra content under the lede (e.g. the blog page's search box). */
  children?: ReactNode;
  className?: string;
};

/**
 * Shared page hero — cream-deep band, gold eyebrow → serif h1 → gold rule →
 * muted lede (docs/templates/bamboo/design.md "Section rhythm"), with an
 * optional arch portrait whose offset gold ring echoes the nav emblem.
 *
 * Hook-free on purpose: server pages (about) and client pages (blog, contact)
 * both import it, so it must never become a client component itself.
 *
 * The portrait is a raw `<img>` rather than `next/image` because field URLs
 * are arbitrary merchant input, matching `blog/bamboo-blog-page.tsx`.
 */
export function BambooPageHero({
  eyebrow,
  eyebrowIcon: EyebrowIcon,
  eyebrowFieldKey,
  title,
  titleFieldKey,
  lede,
  ledeFieldKey,
  image,
  imagePriority,
  sectionAttrs,
  children,
  className,
}: Props) {
  const eyebrowBlock = eyebrow ? (
    <p
      className="mb-3 text-xs font-semibold tracking-widest text-[var(--bam-gold)] uppercase"
      {...(eyebrowFieldKey ? fieldAttr(eyebrowFieldKey) : {})}
    >
      {EyebrowIcon ? (
        <EyebrowIcon
          className="-mt-0.5 mr-1 inline h-3 w-3"
          aria-hidden="true"
        />
      ) : null}
      {eyebrow}
    </p>
  ) : null;

  const titleBlock = (
    <h1 className="text-foreground font-serif text-4xl leading-tight font-bold tracking-tight md:text-5xl">
      <span
        className="text-balance"
        {...(titleFieldKey ? fieldAttr(titleFieldKey) : {})}
      >
        {title}
      </span>
    </h1>
  );

  const ruleBlock = (
    <div
      className="mx-auto mt-6 h-px w-16 bg-[var(--bam-gold)]/40 md:mx-0"
      aria-hidden="true"
    />
  );

  const ledeBlock = lede ? (
    <p
      className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed md:mx-0"
      {...(ledeFieldKey ? fieldAttr(ledeFieldKey) : {})}
    >
      {lede}
    </p>
  ) : null;

  return (
    <section
      {...sectionAttrs}
      className={cn("bg-[var(--bam-cream-deep)]", className)}
    >
      <div className="mx-auto max-w-7xl px-4 py-20 md:py-28 lg:px-8">
        {image ? (
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <FadeIn
              direction="right"
              className="flex-1 text-center md:text-left"
            >
              {eyebrowBlock}
              {titleBlock}
              {ruleBlock}
              {ledeBlock}
              {children}
            </FadeIn>
            <FadeIn
              direction="left"
              delay={0.15}
              className="flex flex-1 justify-center md:justify-end"
            >
              <div className="relative w-full max-w-[15rem] md:max-w-[17rem]">
                {/* offset gold ring tracing the arch — emblem echo */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-2.5 -right-2.5 h-full w-full rounded-t-full rounded-b-2xl border border-[var(--bam-gold)]/50"
                />
                <div className="relative aspect-4/5 overflow-hidden rounded-t-full rounded-b-2xl border border-[var(--bam-hairline)]">
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-cover object-center"
                    loading={imagePriority ? "eager" : "lazy"}
                  />
                </div>
              </div>
            </FadeIn>
          </div>
        ) : (
          <FadeIn
            direction="up"
            className="mx-auto max-w-2xl text-center md:mx-0 md:text-left"
          >
            {eyebrowBlock}
            {titleBlock}
            {ruleBlock}
            {ledeBlock}
            {children}
          </FadeIn>
        )}
      </div>
    </section>
  );
}
