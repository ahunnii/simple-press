import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { FadeIn } from "~/components/page-animations";

import { resolveFields } from "..";

type Props = { customFields: unknown };

/**
 * About teaser — happy-bamboo's about-section composition: a two-column
 * `items-center` split inside the page container, FadeIn left / FadeIn right,
 * gold eyebrow above a `font-serif` h2, body paragraph, then the CTA sitting
 * directly under the copy (never centered under the whole band).
 *
 * DEVIATION (recorded, see docs/templates/bamboo/build/reports/A2-cycle2.md):
 * happy-bamboo fills its left column with a video + a second photo. Bamboo has
 * NO about-teaser media field — its only homepage image field is the hero
 * photo — and this cycle forbids adding fields, so the split carries the
 * heading block on the left and the body + CTA on the right instead of an
 * empty frame or a second printing of the hero image. Stacked at <lg the
 * reading order is identical to happy-bamboo's: eyebrow → h2 → body → CTA.
 */
export function BambooAboutTeaserSection({ customFields }: Props) {
  const f = resolveFields(customFields, [
    "bamboo.homepage.about-teaser-eyebrow",
    "bamboo.homepage.about-teaser-heading",
    "bamboo.homepage.about-teaser-body",
    "bamboo.homepage.about-teaser-button-text",
    "bamboo.homepage.about-teaser-button-link",
  ]);

  const eyebrow = f["bamboo.homepage.about-teaser-eyebrow"] ?? "";
  const body = f["bamboo.homepage.about-teaser-body"] ?? "";
  const buttonText = f["bamboo.homepage.about-teaser-button-text"] ?? "";

  return (
    <section
      {...sectionGroupAttr("homepage", "aboutTeaser")}
      aria-label="About us"
      className="bg-[var(--bam-cream-deep)]"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 md:py-32 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <FadeIn direction="left" className="space-y-5">
            {eyebrow ? (
              <p
                className="text-sm font-semibold tracking-widest text-[var(--bam-gold)] uppercase"
                {...fieldAttr("bamboo.homepage.about-teaser-eyebrow")}
              >
                {eyebrow}
              </p>
            ) : null}

            <h2
              className="text-foreground font-serif text-4xl leading-tight font-bold text-balance md:text-5xl"
              {...fieldAttr("bamboo.homepage.about-teaser-heading")}
            >
              {f["bamboo.homepage.about-teaser-heading"] ?? ""}
            </h2>

            <span
              aria-hidden="true"
              className="block h-px w-16 bg-[var(--bam-gold)]"
            />
          </FadeIn>

          <FadeIn direction="right" className="space-y-8">
            {body ? (
              <p
                className="text-muted-foreground text-lg leading-relaxed text-pretty"
                {...fieldAttr("bamboo.homepage.about-teaser-body")}
              >
                {body}
              </p>
            ) : null}

            {buttonText ? (
              <div>
                <Link
                  href={
                    f["bamboo.homepage.about-teaser-button-link"] ?? "/about"
                  }
                  className="group inline-flex items-center gap-2.5 rounded-full border border-[var(--bam-forest)] px-7 py-3 text-sm font-semibold tracking-widest text-[var(--bam-forest)] uppercase transition-colors hover:bg-[var(--bam-forest)] hover:text-[var(--bam-cream)]"
                >
                  <span
                    {...fieldAttr("bamboo.homepage.about-teaser-button-text")}
                  >
                    {buttonText}
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            ) : null}
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
