import Image from "next/image";

import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { hasCustomImage, PinkImageFallback } from "../shared/pink-image-fallback";
import { PinkReveal } from "../shared/pink-reveal";

type Props = {
  image: string;
  imageAlt: string;
  quoteBefore: string;
  quoteAccent: string;
  quoteAfter: string;
  body: string;
};

/**
 * `homepage.story` — paper, `.8fr 1.2fr`: a 4:5 portrait left, and on the
 * right an eyebrow, a one-word-accented pull-quote, body copy, and a 3-up
 * stat row above a hairline rule (design.md → Per-page section concepts →
 * Homepage). Hideable.
 */
export function PinkStorySection({
  image,
  imageAlt,
  quoteBefore,
  quoteAccent,
  quoteAfter,
  body,
}: Props) {
  return (
    <section
      aria-labelledby="pink-story-heading"
      className="px-5 py-16 md:px-10 md:py-24"
      {...sectionGroupAttr("homepage", "story")}
    >
      <div className="mx-auto grid max-w-[1400px] gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-center md:gap-14">
        <PinkReveal
          className="relative overflow-hidden"
          style={{ aspectRatio: "4 / 5", background: "var(--pink-panel)" }}
        >
          {hasCustomImage(image) ? (
            <Image
              src={image}
              alt={imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
          ) : (
            <PinkImageFallback surface="paper" className="absolute inset-0" />
          )}
        </PinkReveal>

        <PinkReveal index={1} className="flex flex-col gap-5">

          <h2
            id="pink-story-heading"
            className="pink-display text-[clamp(1.5rem,2.6vw,2.125rem)] leading-[1.2] font-semibold tracking-[-0.015em]"
            style={{ color: "var(--pink-ink)" }}
          >
            {quoteBefore && (
              <span {...fieldAttr("pink.homepage.story-quote-before")}>{quoteBefore} </span>
            )}
            {quoteAccent && (
              <span
                style={{ color: "var(--pink-rose)" }}
                {...fieldAttr("pink.homepage.story-quote-accent")}
              >
                {quoteAccent}
              </span>
            )}
            {quoteAfter && (
              <span {...fieldAttr("pink.homepage.story-quote-after")}> {quoteAfter}</span>
            )}
          </h2>

          {body && (
            <p
              className="max-w-[54ch] text-[16px] leading-[1.7]"
              style={{ color: "var(--pink-body)" }}
              {...fieldAttr("pink.homepage.story-body")}
            >
              {body}
            </p>
          )}

        </PinkReveal>
      </div>
    </section>
  );
}
