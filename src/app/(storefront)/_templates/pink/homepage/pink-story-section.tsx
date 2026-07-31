import Image from "next/image";

import type { TemplateListRow } from "~/lib/template-fields";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { PinkEyebrow } from "../shared/pink-eyebrow";
import { PinkReveal } from "../shared/pink-reveal";
import { rowStr } from "./pink-homepage-list-utils";

type Props = {
  image: string;
  imageAlt: string;
  eyebrow: string;
  quoteBefore: string;
  quoteAccent: string;
  quoteAfter: string;
  body: string;
  stats: TemplateListRow[];
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
  eyebrow,
  quoteBefore,
  quoteAccent,
  quoteAfter,
  body,
  stats,
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
          <Image
            src={image || "/placeholder.svg"}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 40vw"
          />
        </PinkReveal>

        <PinkReveal index={1} className="flex flex-col gap-5">
          {eyebrow && <PinkEyebrow fieldKey="pink.homepage.story-eyebrow">{eyebrow}</PinkEyebrow>}

          <h2
            id="pink-story-heading"
            className="pink-display text-[clamp(24px,2.6vw,34px)] leading-[1.2] font-semibold tracking-[-0.015em]"
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

          {stats.length > 0 && (
            <div
              className="mt-4 grid grid-cols-2 gap-6 pt-6 sm:grid-cols-3"
              style={{ borderTop: "1px solid var(--pink-line)" }}
            >
              {stats.map((stat, i) => (
                <div key={stat._id ?? i} className="flex flex-col gap-1.5">
                  <span
                    className="pink-display"
                    style={{
                      fontSize: "clamp(26px, 2.4vw, 33px)",
                      fontWeight: 700,
                      letterSpacing: "-0.025em",
                      lineHeight: 1,
                      color: "var(--pink-ink)",
                    }}
                  >
                    {rowStr(stat, "value")}
                  </span>
                  <span className="pink-label">{rowStr(stat, "label")}</span>
                </div>
              ))}
            </div>
          )}
        </PinkReveal>
      </div>
    </section>
  );
}
