import Image from "next/image";

import type { TemplateListRow } from "~/lib/template-fields";
import {
  fieldAttr,
  listItemAttr,
  sectionGroupAttr,
} from "~/lib/preview/section-attrs";

import { WealthBlock } from "../shared/wealth-block";
import { WealthReveal, WealthRevealGroup } from "../shared/wealth-reveal";

type Props = {
  heading: string;
  coops: TemplateListRow[];
};

/**
 * Co-op grid — paper block: italic H2, then square hairline cells (logo
 * contained, mono-caps name beneath). A cell with a website links out as a
 * whole. Rows keep their saved-list index for `listItemAttr` even when a
 * blank row is skipped. Hideable (testimonials.coops).
 */
export function WealthTestimonialsCoops({ heading, coops }: Props) {
  const cells = coops
    .map((coop, index) => ({
      id: coop._id ?? String(index),
      index,
      logo: typeof coop.logo === "string" ? coop.logo : "",
      name: typeof coop.name === "string" ? coop.name.trim() : "",
      url: typeof coop.url === "string" ? coop.url.trim() : "",
    }))
    .filter((c) => c.logo !== "" || c.name !== "");

  if (cells.length === 0) return null;
  const hasHeading = heading.trim() !== "";

  return (
    <WealthBlock
      tone="paper"
      aria-labelledby={hasHeading ? "wealth-testimonials-coops-h" : undefined}
      aria-label={hasHeading ? undefined : "Co-ops we have supported"}
      {...sectionGroupAttr("testimonials", "coops")}
    >
      {hasHeading ? (
        <WealthReveal className="wealth-section-head">
          <h2
            id="wealth-testimonials-coops-h"
            className="wealth-h2"
            {...fieldAttr("wealth.testimonials.coops-heading")}
          >
            {heading}
          </h2>
        </WealthReveal>
      ) : null}
      <WealthRevealGroup threshold={0}>
        <ul className="wealth-testimonials-coops">
          {cells.map((cell, i) => {
            const external = /^https?:\/\//i.test(cell.url);
            const inner = (
              <>
                <span className="wealth-testimonials-coops__logo">
                  {cell.logo ? (
                    <Image
                      src={cell.logo}
                      alt={cell.name ? "" : "Co-op logo"}
                      fill
                      sizes="(min-width: 1100px) 220px, (min-width: 640px) 25vw, 45vw"
                    />
                  ) : null}
                </span>
                {cell.name ? (
                  <span className="wealth-testimonials-coops__name">
                    {cell.name}
                    {external ? <span aria-hidden="true"> &#8599;</span> : null}
                  </span>
                ) : null}
              </>
            );
            return (
              <li
                key={cell.id}
                className="wealth-reveal-item"
                style={{ "--i": Math.min(i, 7) } as React.CSSProperties}
                {...listItemAttr("wealth.testimonials.coops", cell.index)}
              >
                {cell.url ? (
                  <a
                    href={cell.url}
                    className="wealth-testimonials-coops__cell"
                    {...(external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {inner}
                    {external ? (
                      <span className="sr-only"> (opens in new tab)</span>
                    ) : null}
                  </a>
                ) : (
                  <div className="wealth-testimonials-coops__cell">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </WealthRevealGroup>
    </WealthBlock>
  );
}
