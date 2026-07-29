import Image from "next/image";
import Link from "next/link";

import type { TemplateListRow } from "~/lib/template-fields";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";

import { PinkEyebrow } from "../shared/pink-eyebrow";
import { PinkHairlineGrid } from "../shared/pink-hairline-grid";
import { PinkReveal } from "../shared/pink-reveal";
import { rowNum, rowStr } from "./pink-homepage-list-utils";

type Props = {
  eyebrow: string;
  heading: string;
  note: string;
  mosaic: TemplateListRow[];
  cards: TemplateListRow[];
};

/**
 * `homepage.events` — the make & takes band. Ink section with a studio photo
 * mosaic and a 3-up card row of upcoming sessions, both driven by template
 * `list` fields rather than the Services DB (design.md → Per-page section
 * concepts → Homepage; per intake). Hideable.
 */
export function PinkEventsSection({ eyebrow, heading, note, mosaic, cards }: Props) {
  if (cards.length === 0 && mosaic.length === 0) return null;

  return (
    <section
      id="make-and-takes"
      aria-labelledby="pink-events-heading"
      className="px-5 py-16 md:px-10 md:py-24"
      style={{ background: "var(--pink-ink)" }}
      {...sectionGroupAttr("homepage", "events")}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-3">
          {eyebrow && (
            <PinkEyebrow tone="dark" fieldKey="pink.homepage.events-eyebrow">
              {eyebrow}
            </PinkEyebrow>
          )}
          <h2
            id="pink-events-heading"
            className="pink-display text-[clamp(26px,2.8vw,38px)] font-semibold tracking-[-0.025em]"
            style={{ color: "var(--pink-paper)" }}
            {...fieldAttr("pink.homepage.events-heading")}
          >
            {heading}
          </h2>
          {note && (
            <p
              className="max-w-[52ch] text-[15px] leading-[1.7]"
              style={{ color: "var(--pink-ink-muted)" }}
              {...fieldAttr("pink.homepage.events-note")}
            >
              {note}
            </p>
          )}
        </div>

        {/* A mosaic where NO tile has an image is a ~340px block of bare dark
            cells — a visible void on a fresh store, not a designed empty state.
            Individual unset tiles inside an otherwise-filled mosaic still render
            bare (that IS designed); only the all-empty case collapses. */}
        {mosaic.some((row) => rowStr(row, "image")) && (
          <div
            className="mt-10 grid gap-[2px]"
            style={{ gridTemplateColumns: "repeat(4, 1fr)", gridAutoRows: "168px" }}
          >
            {mosaic.map((row, i) => (
              <div
                key={row._id ?? i}
                className="relative overflow-hidden border-2 border-transparent transition-colors duration-300 hover:border-[var(--pink-blush)]"
                style={{
                  gridColumn: `span ${Math.max(1, Math.round(rowNum(row, "colSpan", 1)))}`,
                  gridRow: `span ${Math.max(1, Math.round(rowNum(row, "rowSpan", 1)))}`,
                  background: "var(--pink-ink-tint)",
                }}
              >
                {/* Unset tiles stay bare on --pink-ink-tint rather than showing
                    a light placeholder inside the dark band. */}
                {rowStr(row, "image") ? (
                  <Image
                    src={rowStr(row, "image")}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}

        {cards.length > 0 && (
          <PinkHairlineGrid
            tone="dark"
            columnsClassName="mt-10 grid-cols-1 md:grid-cols-3"
          >
            {cards.map((card, i) => (
              <PinkReveal key={card._id ?? i} index={i} className="flex flex-col gap-4 p-7 md:p-8">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className="pink-display text-[15px] font-semibold"
                    style={{ color: "var(--pink-blush)" }}
                  >
                    {rowStr(card, "date")}
                  </span>
                  <span className="pink-label-dark">{rowStr(card, "availability")}</span>
                </div>
                <h3 className="pink-display text-[19px] font-semibold" style={{ color: "var(--pink-paper)" }}>
                  {rowStr(card, "title")}
                </h3>
                {rowStr(card, "body") && (
                  <p className="text-[15px] leading-[1.7]" style={{ color: "var(--pink-ink-muted)" }}>
                    {rowStr(card, "body")}
                  </p>
                )}
                <p className="pink-display text-[15px] font-semibold" style={{ color: "var(--pink-paper)" }}>
                  {rowStr(card, "price")}
                </p>
                {rowStr(card, "ctaLabel") && (
                  <Link
                    href={rowStr(card, "ctaHref") || "/contact"}
                    className="pink-btn pink-btn-solid mt-auto justify-center"
                  >
                    {rowStr(card, "ctaLabel")}
                  </Link>
                )}
              </PinkReveal>
            ))}
          </PinkHairlineGrid>
        )}
      </div>
    </section>
  );
}
