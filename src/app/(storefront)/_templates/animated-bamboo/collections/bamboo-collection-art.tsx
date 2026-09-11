import type { CSSProperties } from "react";

import type { BambooGlyphId } from "../shared/bamboo-glyph";

/**
 * Shared card decoration for the two collections slots.
 *
 * `BAMBOO_BLOB_PERSONALITIES` gives every tile in a row its own blob shape,
 * tint and angle (design.md: "the row must not read stamped"). The first three
 * entries are the mockup's featured-grid personalities; entries 4-5 are the
 * shop grid's `nth-child(4|5)` variants, retinted onto brand tokens.
 *
 * `BambooCollectionArt` is the illustrated fallback a collection gets when the
 * owner hasn't uploaded an image — composed from sprite fragments the same way
 * the mockup's illustrated shop cards are (mockup-b-shop.elided.html cards
 * 2-5): one wrapper `<svg>` with a POSITIVE viewBox, `<use>` fragments placed
 * with x/y/width/height, and a ground-shadow ellipse under each object so
 * nothing floats. Purely decorative — the card's heading link carries the
 * accessible name, so these are `aria-hidden`.
 */

export const BAMBOO_BLOB_PERSONALITIES: Record<string, string>[] = [
  {
    "--bc": "var(--bamboo-sage)",
    "--br": "-13deg",
    "--bw": "80%",
    "--bh": "76%",
    "--brad": "58% 42% 47% 53% / 45% 52% 48% 55%",
  },
  {
    "--bc": "var(--bamboo-sage-deep)",
    "--br": "9deg",
    "--bw": "74%",
    "--bh": "81%",
    "--brad": "44% 56% 62% 38% / 53% 42% 58% 47%",
  },
  {
    "--bc": "var(--bamboo-sage)",
    "--br": "-3deg",
    "--bw": "79%",
    "--bh": "73%",
    "--brad": "64% 36% 39% 61% / 37% 59% 41% 63%",
  },
  {
    "--bc": "var(--bamboo-sage-deep)",
    "--br": "7deg",
    "--bw": "76%",
    "--bh": "79%",
    "--brad": "52% 48% 36% 64% / 58% 40% 60% 42%",
  },
  {
    "--bc": "var(--bamboo-sage)",
    "--br": "-9deg",
    "--bw": "82%",
    "--bh": "74%",
    "--brad": "39% 61% 57% 43% / 48% 56% 44% 52%",
  },
];

type ArtNode =
  | {
      kind: "shadow";
      cx: number;
      cy: number;
      rx: number;
      ry: number;
      o: string;
    }
  | {
      kind: "piece";
      id: BambooGlyphId;
      x: number;
      y: number;
      w: number;
      h: number;
    };

/**
 * Four compositions, cycled by card index. Fragment widths/heights keep each
 * symbol's authored aspect ratio (see BAMBOO_GLYPH_DIMENSIONS); nodes are
 * painted in array order, so every shadow is listed before the object that
 * casts it and behind the object in front of it.
 */
const COMPOSITIONS: { width: string; nodes: ArtNode[] }[] = [
  // Two standing rolls.
  {
    width: "84%",
    nodes: [
      { kind: "shadow", cx: 90, cy: 196, rx: 54, ry: 10, o: "0.13" },
      { kind: "shadow", cx: 210, cy: 226, rx: 60, ry: 11, o: "0.16" },
      { kind: "piece", id: "s-roll-tall", x: 16, y: 20, w: 146, h: 186 },
      { kind: "piece", id: "s-roll-tall", x: 132, y: 42, w: 152, h: 194 },
    ],
  },
  // A tissue box with a roll resting on top-down view beside it.
  {
    width: "86%",
    nodes: [
      { kind: "shadow", cx: 150, cy: 224, rx: 94, ry: 15, o: "0.16" },
      { kind: "piece", id: "s-roll-top", x: 182, y: 30, w: 82, h: 82 },
      { kind: "piece", id: "s-tissue-box", x: 40, y: 56, w: 212, h: 170 },
    ],
  },
  // Her pack with two rolls standing behind it.
  {
    width: "88%",
    nodes: [
      { kind: "shadow", cx: 55, cy: 171, rx: 42, ry: 8, o: "0.12" },
      { kind: "shadow", cx: 249, cy: 167, rx: 44, ry: 8, o: "0.12" },
      { kind: "piece", id: "s-roll-front", x: 12, y: 87, w: 86, h: 83 },
      { kind: "piece", id: "s-roll-front", x: 204, y: 81, w: 90, h: 86 },
      { kind: "shadow", cx: 152, cy: 212, rx: 92, ry: 13, o: "0.16" },
      { kind: "piece", id: "s-pack", x: 58, y: 30, w: 192, h: 186 },
    ],
  },
  // The mixed bundle: pack, tall roll, tissue box.
  {
    width: "88%",
    nodes: [
      { kind: "shadow", cx: 158, cy: 166, rx: 40, ry: 8, o: "0.12" },
      { kind: "piece", id: "s-roll-tall", x: 110, y: 42, w: 96, h: 122 },
      { kind: "shadow", cx: 88, cy: 214, rx: 66, ry: 11, o: "0.16" },
      { kind: "piece", id: "s-pack", x: 18, y: 76, w: 140, h: 136 },
      { kind: "shadow", cx: 235, cy: 214, rx: 56, ry: 10, o: "0.15" },
      { kind: "piece", id: "s-tissue-box", x: 176, y: 118, w: 118, h: 94 },
    ],
  },
];

export function BambooCollectionArt({ index }: { index: number }) {
  const composition =
    COMPOSITIONS[index % COMPOSITIONS.length] ?? COMPOSITIONS[0];
  if (!composition) return null;

  return (
    <span
      className="relative block"
      style={{ width: composition.width } as CSSProperties}
      aria-hidden="true"
    >
      <svg viewBox="0 0 300 250" className="block h-auto w-full">
        {composition.nodes.map((node, i) =>
          node.kind === "shadow" ? (
            <ellipse
              key={i}
              cx={node.cx}
              cy={node.cy}
              rx={node.rx}
              ry={node.ry}
              fill="var(--bamboo-pine)"
              opacity={node.o}
            />
          ) : (
            <use
              key={i}
              href={`#${node.id}`}
              x={node.x}
              y={node.y}
              width={node.w}
              height={node.h}
            />
          ),
        )}
      </svg>
    </span>
  );
}
