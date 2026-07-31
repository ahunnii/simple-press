import type { TemplateListRow } from "~/lib/template-fields";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";

import { PinkHairlineGrid } from "../shared/pink-hairline-grid";
import { PinkReveal } from "../shared/pink-reveal";
import { PinkRule } from "../shared/pink-rule";
import { rowStr } from "./pink-homepage-list-utils";

type Props = {
  items: TemplateListRow[];
};

/**
 * `homepage.promises` — 3-column hairline grid on paper, each cell a rule +
 * title + body (design.md → Per-page section concepts → Homepage). Hideable.
 */
export function PinkPromisesSection({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="pink-promises-heading"
      className="px-5 py-16 md:px-10 md:py-20"
      {...sectionGroupAttr("homepage", "promises")}
    >
      <div className="mx-auto max-w-[1400px]">
        {/* The band is deliberately headline-less by design, but the cards use
            h3 — without an h2 the document jumped h1 → h3 (axe heading-order).
            A visually hidden h2 keeps the outline honest and the design intact. */}
        <h2 id="pink-promises-heading" className="sr-only">
          What you can count on
        </h2>
        <PinkHairlineGrid columnsClassName="grid-cols-1 md:grid-cols-3">
          {items.map((item, i) => (
            <PinkReveal key={item._id ?? i} index={i} className="flex flex-col gap-4 p-8 md:p-9">
              <PinkRule width={38} />
              <h3
                className="pink-display text-[19px] font-semibold tracking-[-0.01em]"
                style={{ color: "var(--pink-ink)" }}
              >
                {rowStr(item, "title")}
              </h3>
              <p className="text-[15px] leading-[1.7]" style={{ color: "var(--pink-body)" }}>
                {rowStr(item, "body")}
              </p>
            </PinkReveal>
          ))}
        </PinkHairlineGrid>
      </div>
    </section>
  );
}
