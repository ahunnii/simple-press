import Image from "next/image";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { WealthBlock } from "../shared/wealth-block";
import { WealthReveal, WealthRevealGroup } from "../shared/wealth-reveal";

type Testimonial = RouterOutputs["testimonial"]["list"][number];

type Props = {
  heading: string;
  emptyMessage: string;
  testimonials: Testimonial[];
};

/**
 * In their words — surface block: italic H2, then APPROVED testimonials as
 * quote cards (2-up desktop). No approved testimonials → a quiet designed
 * note with `quotes-empty-message`. Never any sample quotes. Not hideable.
 */
export function WealthTestimonialsQuotes({
  heading,
  emptyMessage,
  testimonials,
}: Props) {
  const quotes = testimonials.filter((t) => t.text.trim() !== "");
  const hasHeading = heading.trim() !== "";

  return (
    <WealthBlock
      tone="surface"
      aria-labelledby={hasHeading ? "wealth-testimonials-quotes-h" : undefined}
      aria-label={hasHeading ? undefined : "In their words"}
      {...sectionGroupAttr("testimonials", "quotes")}
    >
      {hasHeading ? (
        <WealthReveal className="wealth-section-head">
          <h2
            id="wealth-testimonials-quotes-h"
            className="wealth-h2"
            {...fieldAttr("wealth.testimonials.quotes-heading")}
          >
            {heading}
          </h2>
        </WealthReveal>
      ) : null}

      {quotes.length > 0 ? (
        <WealthRevealGroup threshold={0}>
          <ul className="wealth-testimonials-quotes">
            {quotes.map((t, i) => {
              const role = [t.customerTitle, t.customerCompany]
                .map((part) => part?.trim() ?? "")
                .filter(Boolean)
                .join(", ");
              const photo = t.photoUrls[0];
              return (
                <li
                  key={t.id}
                  className="wealth-reveal-item"
                  style={{ "--i": Math.min(i, 7) } as React.CSSProperties}
                >
                  <figure className="wealth-testimonials-quote">
                    <span
                      className="wealth-testimonials-quote__mark"
                      aria-hidden="true"
                    >
                      &ldquo;
                    </span>
                    <blockquote className="wealth-testimonials-quote__text">
                      <p>{t.text}</p>
                    </blockquote>
                    <figcaption className="wealth-testimonials-quote__by">
                      {photo ? (
                        <span className="wealth-testimonials-quote__photo">
                          <Image
                            src={photo}
                            alt={`Photo shared by ${t.customerName}`}
                            fill
                            sizes="64px"
                          />
                        </span>
                      ) : null}
                      <span className="wealth-testimonials-quote__who">
                        <span className="wealth-testimonials-quote__name">
                          {t.customerName}
                        </span>
                        {role ? (
                          <span className="wealth-testimonials-quote__role">
                            {role}
                          </span>
                        ) : null}
                      </span>
                    </figcaption>
                  </figure>
                </li>
              );
            })}
          </ul>
        </WealthRevealGroup>
      ) : emptyMessage.trim() ? (
        <WealthReveal>
          <p
            className="wealth-testimonials-empty"
            {...fieldAttr("wealth.testimonials.quotes-empty-message")}
          >
            {emptyMessage}
          </p>
        </WealthReveal>
      ) : null}
    </WealthBlock>
  );
}
