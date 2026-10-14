import type {
  HubPosition,
  ImpactProgram,
  ImpactProgramLayout,
} from "./impact-rows";
import type { ImpactFields } from "./wealth-impact-head";
import { fieldAttr, listItemAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { WealthReveal } from "../shared/wealth-reveal";
import { hubPositions, programLayout } from "./impact-rows";
import { WEALTH_IMPACT_KEYS as K } from "./index";
import { ImpactSectionHead, val } from "./wealth-impact-head";

/**
 * Programs hub overview (design.md v2 §7a + "Approved with the mock" hub
 * placement map). Server-safe. Rendered by `WealthImpactPrograms` as the
 * sage inner block of the single `impact.programs` section, never on its own.
 */

// ─── Plan: layout + anchor number per program ───────────────────────────────

export type ImpactProgramEntry = {
  program: ImpactProgram;
  layout: ImpactProgramLayout;
  /**
   * 1-based anchor number (`impact-program-N`) over the programs that render
   * below as a card or row; null for hub-only programs.
   */
  n: number | null;
};

/** `impact-program-N`: id of the Nth rendered program card/row. */
export function programAnchorId(n: number): string {
  return `impact-program-${n}`;
}

/**
 * Decides each program's layout (`programLayout`) and numbers the ones that
 * render below the hub, in the owner's order. Hub tiles link to
 * `#impact-program-N` only when `n` is set.
 */
export function planImpactPrograms(
  programs: ImpactProgram[],
  hubShown: boolean,
): ImpactProgramEntry[] {
  let n = 0;
  return programs.map((program) => {
    const layout = programLayout(program, hubShown);
    if (layout === "hub") return { program, layout, n: null };
    n += 1;
    return { program, layout, n };
  });
}

// ─── Connector geometry (viewBox 0 0 300 300) ───────────────────────────────

const CELL = 100;
/** Tiles fill 72% of their cell (CSS), so half a tile is 36 units. */
const HALF_TILE = 36;
const NODE = 4;

const POSITION_VECTORS: Record<HubPosition, [number, number]> = {
  tl: [-1, -1],
  tc: [0, -1],
  tr: [1, -1],
  r: [1, 0],
  br: [1, 1],
  bc: [0, 1],
  bl: [-1, 1],
  l: [-1, 0],
};

export type HubConnector = {
  pos: HubPosition;
  /** Hub-edge end. */
  x1: number;
  y1: number;
  /** Tile-edge end. */
  x2: number;
  y2: number;
};

/**
 * One hairline per tile from the hub square's edge to the tile's facing
 * edge/corner, in a 300×300 viewBox that maps 1:1 onto the 3×3 grid (the
 * CSS keeps the stage square, so it scales with the layout).
 */
export function hubConnectors(positions: HubPosition[]): HubConnector[] {
  const c = CELL * 1.5;
  return positions.map((pos) => {
    const [dx, dy] = POSITION_VECTORS[pos];
    return {
      pos,
      x1: c + dx * HALF_TILE,
      y1: c + dy * HALF_TILE,
      x2: c + dx * (CELL - HALF_TILE),
      y2: c + dy * (CELL - HALF_TILE),
    };
  });
}

function HubLines({ positions }: { positions: HubPosition[] }) {
  const lines = hubConnectors(positions);
  return (
    <svg
      className="wealth-impact-hub__lines"
      viewBox="0 0 300 300"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        {lines.map((l) => (
          <line
            key={l.pos}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
      <g fill="currentColor">
        {lines.flatMap((l) => [
          <rect
            key={`${l.pos}-a`}
            x={l.x1 - NODE / 2}
            y={l.y1 - NODE / 2}
            width={NODE}
            height={NODE}
          />,
          <rect
            key={`${l.pos}-b`}
            x={l.x2 - NODE / 2}
            y={l.y2 - NODE / 2}
            width={NODE}
            height={NODE}
          />,
        ])}
      </g>
    </svg>
  );
}

// ─── Hub block ──────────────────────────────────────────────────────────────

const HUB_TILE_TONES = ["forest", "primary", "paper"] as const;

function HubTileContent({ program }: { program: ImpactProgram }) {
  return program.short ? (
    <>
      <span className="wealth-impact-hub__short">{program.short}</span>
      <span className="wealth-impact-hub__title">{program.title}</span>
    </>
  ) : (
    <span className="wealth-impact-hub__short wealth-impact-hub__short--words">
      {program.title}
    </span>
  );
}

type HubProps = {
  f: ImpactFields;
  /** Render-order section number for the eyebrow (programs section). */
  number?: number;
  /** `id` of the programs section; the hub heading gets `${sectionId}-h`. */
  sectionId: string;
  /** From `planImpactPrograms(programs, true)`; capped at 8 tiles. */
  entries: ImpactProgramEntry[];
};

/**
 * The sage hub-overview block: numbered eyebrow + `programs-hub-heading` (h2
 * + ↘) on the left; on the right a square 3×3 stage with the forest hub
 * label at the centre, program tiles placed by `hubPositions` (cycling
 * forest / primary / paper, each with a ledge) and aria-hidden hairline
 * connectors with square nodes. Phones: full-width hub bar, then a 2-col
 * tile grid without connectors. Tiles link to `#impact-program-N` only when
 * that program renders below as a card or row.
 */
export function WealthImpactHub({ f, number, sectionId, entries }: HubProps) {
  const label = val(f, K.programsHubLabel);
  const tiles = entries.slice(0, 8);
  const positions = hubPositions(tiles.length);
  const labelId = `${sectionId}-hub-label`;

  return (
    <div className="wealth-section wealth-on-sage wealth-impact-hubblock">
      <div className="wealth-container wealth-impact-hubblock__grid">
        <ImpactSectionHead
          sectionId={sectionId}
          number={number}
          eyebrow={val(f, K.programsEyebrow)}
          eyebrowKey={K.programsEyebrow}
          heading={val(f, K.programsHubHeading)}
          headingKey={K.programsHubHeading}
        />
        <WealthReveal delay={1} className="wealth-impact-hub">
          <HubLines positions={positions} />
          <p
            id={labelId}
            {...fieldAttr(K.programsHubLabel)}
            className="wealth-impact-hub__hub"
          >
            {label}
          </p>
          <ul aria-labelledby={labelId} className="wealth-impact-hub__grid">
            {tiles.map((entry, i) => {
              const tone = HUB_TILE_TONES[i % HUB_TILE_TONES.length];
              const cls = cn(
                "wealth-impact-hub__tile",
                `wealth-impact-hub__tile--${tone}`,
              );
              return (
                <li
                  key={entry.program.id}
                  {...listItemAttr(K.programsItems, entry.program.index)}
                  data-pos={positions[i]}
                  className="wealth-impact-hub__cell"
                >
                  {entry.n !== null ? (
                    <a href={`#${programAnchorId(entry.n)}`} className={cls}>
                      <HubTileContent program={entry.program} />
                    </a>
                  ) : (
                    <span className={cls}>
                      <HubTileContent program={entry.program} />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </WealthReveal>
      </div>
    </div>
  );
}
