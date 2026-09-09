import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { FadeIn } from "~/components/page-animations";

import { DEFAULT_BAMBOO_HERO_BADGES } from ".";
import { resolveFields } from "..";

type Props = { customFields: unknown };

/**
 * Split editorial hero — copy left, arched photography right (stacked on
 * mobile). Flat cream: the hanging emblem in the header overhangs the top of
 * the page, so the generous `pt-24 lg:pt-32` is load-bearing, not decoration —
 * it is what keeps the emblem clear of the kicker at every width from lg up.
 */
export function BambooHeroSection({ customFields }: Props) {
  const f = resolveFields(customFields, [
    "bamboo.homepage.hero-image",
    "bamboo.homepage.hero-title",
    "bamboo.homepage.hero-title-accent",
    "bamboo.homepage.hero-tagline",
    "bamboo.homepage.hero-description",
    "bamboo.homepage.hero-primary-button-link",
    "bamboo.homepage.hero-primary-button-text",
    "bamboo.homepage.hero-secondary-button-link",
    "bamboo.homepage.hero-secondary-button-text",
  ]);

  const badges =
    parseTemplateIconListRows(
      getListFieldValue(customFields, "bamboo.homepage.hero-badges"),
      DEFAULT_BAMBOO_HERO_BADGES,
    ) ?? [];

  const tagline = f["bamboo.homepage.hero-tagline"] ?? "";
  const description = f["bamboo.homepage.hero-description"] ?? "";
  const secondaryText = f["bamboo.homepage.hero-secondary-button-text"] ?? "";

  return (
    <section
      {...sectionGroupAttr("homepage", "hero")}
      aria-label="Introduction"
      className="relative overflow-hidden bg-[var(--bam-cream)]"
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 pt-24 pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:pt-32 lg:pb-28">
        <FadeIn direction="right" className="flex flex-col items-start">
          {tagline ? (
            <p
              className="text-sm font-semibold tracking-widest text-[var(--bam-gold)] uppercase"
              {...fieldAttr("bamboo.homepage.hero-tagline")}
            >
              {tagline}
            </p>
          ) : null}

          {/* Spectral (`font-serif`) + the mockup's caps treatment: the caps are
              pinned by the client mockup, the serif is the shared happy-bamboo
              accent voice. Section h2s take the same serif WITHOUT the caps. */}
          <h1 className="mt-5 font-serif text-4xl leading-[1.08] tracking-wide uppercase md:text-5xl lg:text-6xl">
            <span
              className="text-foreground block text-balance"
              {...fieldAttr("bamboo.homepage.hero-title")}
            >
              {f["bamboo.homepage.hero-title"] ?? ""}
            </span>
            <span
              className="block text-balance text-[var(--bam-gold)]"
              {...fieldAttr("bamboo.homepage.hero-title-accent")}
            >
              {f["bamboo.homepage.hero-title-accent"] ?? ""}
            </span>
          </h1>

          <span
            aria-hidden="true"
            className="mt-7 block h-px w-16 bg-[var(--bam-gold)]"
          />

          {description ? (
            <p
              className="text-muted-foreground mt-7 max-w-md text-lg leading-relaxed text-pretty"
              {...fieldAttr("bamboo.homepage.hero-description")}
            >
              {description}
            </p>
          ) : null}

          {badges.length > 0 && (
            <ul className="mt-10 flex w-full flex-wrap border-y border-[var(--bam-hairline)] py-6">
              {badges.map((badge, index) => (
                <li
                  key={`${badge.title}-${index}`}
                  className={cn(
                    "flex w-1/3 min-w-0 flex-col items-center gap-2.5 px-2 py-3 text-center sm:w-auto sm:flex-1 sm:py-0",
                    index > 0 &&
                      "sm:border-l sm:border-[var(--bam-hairline)] sm:pl-3",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--bam-gold)]/40"
                  >
                    <badge.icon className="size-5 text-[var(--bam-forest)]" />
                  </span>
                  <span className="text-foreground text-[0.625rem] leading-tight font-semibold tracking-widest uppercase">
                    {badge.title}
                  </span>
                  {badge.description ? (
                    <span className="text-muted-foreground text-[0.625rem] leading-tight">
                      {badge.description}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href={f["bamboo.homepage.hero-primary-button-link"] ?? "/shop"}
              className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--bam-forest)] px-7 py-3.5 text-sm font-semibold tracking-widest text-[var(--bam-cream)] uppercase transition-colors hover:bg-[var(--bam-forest-deep)]"
            >
              <Leaf className="size-4 shrink-0" aria-hidden="true" />
              <span {...fieldAttr("bamboo.homepage.hero-primary-button-text")}>
                {f["bamboo.homepage.hero-primary-button-text"] ?? ""}
              </span>
              <ArrowRight
                className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>

            {secondaryText ? (
              <Link
                href={
                  f["bamboo.homepage.hero-secondary-button-link"] ?? "/about"
                }
                className="text-sm font-semibold tracking-widest text-[var(--bam-forest)] uppercase underline-offset-8 transition-colors hover:text-[var(--bam-forest-deep)] hover:underline"
                {...fieldAttr("bamboo.homepage.hero-secondary-button-text")}
              >
                {secondaryText}
              </Link>
            ) : null}
          </div>
        </FadeIn>

        <FadeIn direction="left" delay={0.15} className="relative">
          {/* Offset gold hairline frame — the arch is echoed, never outlined twice. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-3 rounded-t-full rounded-b-2xl border border-[var(--bam-gold)]/25"
          />
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-t-full rounded-b-2xl bg-[var(--bam-cream-deep)] ring-1 ring-[var(--bam-gold)]/30 sm:aspect-square lg:aspect-4/5">
            <Image
              src={f["bamboo.homepage.hero-image"] ?? "/placeholder.svg"}
              alt=""
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
