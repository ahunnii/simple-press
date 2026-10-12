import type { ImpactBodyBlock } from "./impact-markup";
import type { ImpactSpotlight } from "./impact-rows";
import type { ImpactFields } from "./wealth-impact-head";
import { listItemAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { WealthReveal } from "../shared/wealth-reveal";
import {
  impactBodyBlocks,
  ImpactParagraphs,
  renderImpactText,
} from "./impact-markup";
import { spotlightAnchorId } from "./impact-rows";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import {
  ImpactBleedPhoto,
  ImpactHeadingMark,
  ImpactNumeralTile,
} from "./wealth-impact-devices";
import { formatSectionNumber } from "./wealth-impact-head";

export type ImpactSpotlightTone = "surface" | "paper";

/** Alternating tone by 1-based rendered position: 1 surface, 2 paper, … */
export function spotlightTone(n: number): ImpactSpotlightTone {
  return n % 2 === 1 ? "surface" : "paper";
}

export type ImpactSpotlightLayout = "figures" | "photo" | "facts";

/**
 * design.md v2 §9: figures present → numeral-tile column + lead; else a
 * photo → half-bleed split; else the "Why it matters" facts layout.
 */
export function spotlightLayout(
  s: Pick<ImpactSpotlight, "figures" | "image">,
): ImpactSpotlightLayout {
  if (s.figures.length > 0) return "figures";
  if (s.image) return "photo";
  return "facts";
}

/** Splits off the first plain paragraph as the figures layout's lead. */
export function spotlightLead(blocks: ImpactBodyBlock[]): {
  lead: string;
  rest: ImpactBodyBlock[];
} {
  const first = blocks[0];
  if (first?.kind === "p") return { lead: first.text, rest: blocks.slice(1) };
  return { lead: "", rest: blocks };
}

type Props = {
  /** Accepted for contract parity (§7); spotlights have no scalar fields. */
  f?: ImpactFields;
  /** The parsed row (`parseImpactSpotlights`). */
  spotlight: ImpactSpotlight;
  /** 1-based position among RENDERED spotlights → `impact-spotlight-N`. */
  n: number;
  /** Render-order section number for the eyebrow ("07 · Spotlight"). */
  number?: number;
  /** Rendered source count, for `[N]` footnotes in body + callout. */
  sourceCount: number;
  /** Section tone; default `spotlightTone(n)` (surface, paper, …). */
  tone?: ImpactSpotlightTone;
};

function SpotlightHead({
  s,
  id,
  number,
}: {
  s: ImpactSpotlight;
  id: string;
  number?: number;
}) {
  // Custom head (not ImpactSectionHead): list columns take no fieldAttr.
  return (
    <WealthReveal className="wealth-section-head wealth-impact-head">
      {s.eyebrow ? (
        <p className="wealth-eyebrow wealth-eyebrow--block">
          {number !== undefined ? (
            <span className="wealth-impact-no" aria-hidden="true">
              {formatSectionNumber(number)}
              {" · "}
            </span>
          ) : null}
          <span>{s.eyebrow}</span>
        </p>
      ) : null}
      <h2
        id={`${id}-h`}
        className="wealth-h2 wealth-impact-h2 wealth-impact-h2--xl"
      >
        {s.heading}
      </h2>
      <ImpactHeadingMark />
    </WealthReveal>
  );
}

/** Bold-lead points: 2-col grid between hairlines (mock "Technical assistance"). */
function Points({
  items,
  sourceCount,
}: {
  items: Extract<ImpactBodyBlock, { kind: "points" }>["items"];
  sourceCount: number;
}) {
  return (
    <WealthReveal className="wealth-impact-points">
      {items.map((item, i) => (
        <div key={i} className="wealth-impact-point">
          <h3 className="wealth-impact-point__title">
            {renderImpactText(item.lead, { sourceCount })}
          </h3>
          {item.rest ? (
            <p>{renderImpactText(item.rest, { sourceCount })}</p>
          ) : null}
        </div>
      ))}
    </WealthReveal>
  );
}

/** Body blocks in order: plain paragraphs as `className` stacks, points grids. */
function Blocks({
  blocks,
  sourceCount,
  paraClassName,
}: {
  blocks: ImpactBodyBlock[];
  sourceCount: number;
  paraClassName: string;
}) {
  // Group consecutive plain paragraphs into one wrapper.
  const groups: (
    | { kind: "ps"; texts: string[] }
    | Extract<ImpactBodyBlock, { kind: "points" }>
  )[] = [];
  for (const b of blocks) {
    if (b.kind === "points") {
      groups.push(b);
      continue;
    }
    const last = groups[groups.length - 1];
    if (last?.kind === "ps") last.texts.push(b.text);
    else groups.push({ kind: "ps", texts: [b.text] });
  }
  return (
    <>
      {groups.map((g, i) =>
        g.kind === "points" ? (
          <Points key={i} items={g.items} sourceCount={sourceCount} />
        ) : (
          <WealthReveal key={i} className={paraClassName}>
            {g.texts.map((t, j) => (
              <p key={j}>{renderImpactText(t, { sourceCount })}</p>
            ))}
          </WealthReveal>
        ),
      )}
    </>
  );
}

/** Sage callout box (btn-ink, ledge) with the square → mark. */
function Callout({ text, sourceCount }: { text: string; sourceCount: number }) {
  return (
    <WealthReveal delay={1} className="wealth-impact-callout">
      <span className="wealth-impact-callout__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            d="M4 12h15M13 6l6 6-6 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="square"
          />
        </svg>
      </span>
      <div className="wealth-impact-callout__body">
        <ImpactParagraphs text={text} sourceCount={sourceCount} />
      </div>
    </WealthReveal>
  );
}

/**
 * ONE spotlight section (design.md v2 §9); the page maps over the rows so
 * each gets its own menu entry and number. Every root shares the
 * `impact.spotlights` group and carries `listItemAttr` for its row.
 *
 * Layouts (`spotlightLayout`):
 * - "figures": light-context forest numeral tiles (lg) with mono captions
 *   beside the first plain paragraph as the primary-green lead; then the
 *   remaining body (paragraphs, bold-lead points grid). A photo is ignored.
 * - "photo": half-bleed photo right, head + body + callout in the text half.
 * - "facts" (mock "Why it matters"): head left, plain paragraphs as
 *   hairline-separated fact rows on the right, callout offset right.
 * The callout (sage box, → mark) follows the body in every layout.
 */
export function WealthImpactSpotlight({
  spotlight: s,
  n,
  number,
  sourceCount,
  tone,
}: Props) {
  const id = spotlightAnchorId(n);
  const layout = spotlightLayout(s);
  const blocks = impactBodyBlocks(s.body);
  const rootProps = {
    ...sectionGroupAttr("impact", "spotlights"),
    ...listItemAttr(K.spotlightsItems, s.index),
    id,
    tabIndex: -1,
    "aria-labelledby": `${id}-h`,
  };
  const toneClass = `wealth-on-${tone ?? spotlightTone(n)}`;
  const callout = s.callout ? (
    <Callout text={s.callout} sourceCount={sourceCount} />
  ) : null;

  if (layout === "photo") {
    return (
      <section
        {...rootProps}
        className={cn(
          "wealth-section wealth-impact-anchor wealth-impact-spot wealth-impact-spot--photo wealth-impact-bleed wealth-impact-bleed--right",
          toneClass,
        )}
      >
        <ImpactBleedPhoto src={s.image} alt={s.imageAlt} reveal />
        <div className="wealth-container">
          <div className="wealth-impact-bleed__text">
            <SpotlightHead s={s} id={id} number={number} />
            <Blocks
              blocks={blocks}
              sourceCount={sourceCount}
              paraClassName="wealth-impact-copy wealth-impact-copy--lg"
            />
            {callout}
          </div>
        </div>
      </section>
    );
  }

  if (layout === "facts") {
    return (
      <section
        {...rootProps}
        className={cn(
          "wealth-section wealth-impact-anchor wealth-impact-spot wealth-impact-spot--facts",
          toneClass,
        )}
      >
        <div className="wealth-container wealth-impact-spot__grid">
          <SpotlightHead s={s} id={id} number={number} />
          <div className="wealth-impact-spot__main">
            <Blocks
              blocks={blocks}
              sourceCount={sourceCount}
              paraClassName="wealth-impact-facts"
            />
            {callout}
          </div>
        </div>
      </section>
    );
  }

  const { lead, rest } = spotlightLead(blocks);
  return (
    <section
      {...rootProps}
      className={cn(
        "wealth-section wealth-impact-anchor wealth-impact-spot wealth-impact-spot--figures",
        toneClass,
      )}
    >
      <div className="wealth-container">
        <SpotlightHead s={s} id={id} number={number} />
        <div
          className={cn(
            "wealth-impact-spot__figs",
            !lead && "wealth-impact-spot__figs--solo",
          )}
        >
          <WealthReveal as="div" className="wealth-impact-figs-wrap">
            <ul className="wealth-impact-figs">
              {s.figures.map((fig, i) => (
                <li key={i} className="wealth-impact-fig">
                  <ImpactNumeralTile value={fig.value} size="lg" />
                  {fig.caption ? (
                    <span className="wealth-impact-fig__cap">
                      {fig.caption}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </WealthReveal>
          {lead ? (
            <WealthReveal delay={1}>
              <p className="wealth-impact-spot__lead">
                {renderImpactText(lead, { sourceCount })}
              </p>
            </WealthReveal>
          ) : null}
        </div>
        <Blocks
          blocks={rest}
          sourceCount={sourceCount}
          paraClassName="wealth-impact-copy wealth-impact-spot__copy"
        />
        {callout ? (
          <div className="wealth-impact-spot__aside">{callout}</div>
        ) : null}
      </div>
    </section>
  );
}
