import { cn } from "~/lib/utils";

/**
 * One lanceolate leaf in local space: petiole at the origin, blade running
 * along +x to a tip at (length, bend). Two cubics meet at the tip so it
 * tapers to a point; the widest point sits about a third of the way out, the
 * way a real bamboo blade does. Positive `bend` droops the tip toward local +y.
 */
function leafPath(length: number, halfWidth: number, bend: number) {
  const L = length;
  const w = halfWidth;
  const b = bend;
  return [
    "M0,0",
    `C${0.12 * L},${-w} ${0.5 * L},${-0.95 * w + 0.4 * b} ${L},${b}`,
    `C${0.55 * L},${0.6 * w + 0.5 * b} ${0.16 * L},${0.9 * w} 0,0`,
    "Z",
  ].join(" ");
}

/** The midrib follows the blade's spine and stops just short of the tip. */
function midribPath(length: number, bend: number) {
  return `M${0.04 * length},0 Q${0.5 * length},${0.2 * bend} ${0.9 * length},${0.8 * bend}`;
}

type Leaf = {
  /** Petiole position in the 240×160 viewBox. */
  x: number;
  y: number;
  /** Degrees; 0 points right, negative lifts the blade upward. */
  angle: number;
  length: number;
  halfWidth: number;
  bend: number;
  tone: "leaf" | "leaf-deep";
  midrib?: boolean;
};

/*
 * Blades hang in alternate pairs from three nodes along the twig plus one
 * terminal blade, painted back to front: deep-tone blades sit behind so the
 * brighter ones read as nearer. Lengths and angles are deliberately uneven —
 * a symmetric fan reads as clip art. Node points sit on the TWIG curve below.
 */
const SPRIG_LEAVES: Leaf[] = [
  {
    x: 31,
    y: 144,
    angle: -80,
    length: 84,
    halfWidth: 7,
    bend: 10,
    tone: "leaf-deep",
  },
  {
    x: 31,
    y: 144,
    angle: -3,
    length: 96,
    halfWidth: 7.5,
    bend: 8,
    tone: "leaf-deep",
  },
  {
    x: 107,
    y: 99,
    angle: -20,
    length: 104,
    halfWidth: 8,
    bend: 12,
    tone: "leaf-deep",
  },
  {
    x: 67,
    y: 123,
    angle: -58,
    length: 118,
    halfWidth: 9.5,
    bend: 14,
    tone: "leaf",
    midrib: true,
  },
  {
    x: 67,
    y: 123,
    angle: -5,
    length: 132,
    halfWidth: 10,
    bend: 16,
    tone: "leaf",
    midrib: true,
  },
  {
    x: 150,
    y: 72,
    angle: -36,
    length: 90,
    halfWidth: 8,
    bend: 10,
    tone: "leaf",
    midrib: true,
  },
];

/** The twig: a gentle arc from the corner out to the terminal blade. */
const TWIG = "M-2,162 C40,140 90,110 150,72";
const NODES = [
  [31, 144],
  [67, 123],
  [107, 99],
] as const;

const leafTransform = (leaf: Leaf) =>
  `translate(${leaf.x} ${leaf.y}) rotate(${leaf.angle})`;

/**
 * BambooLeafSprig — the stylised bamboo sprig tucked into the nav bar's top-left
 * corner and the homepage value band (layered in its corners, and rising over
 * its gold wave line), standing in for the photographic leaves in the client
 * mockup. Botanical and slender, never the cartoon glyph
 * register of `animated-bamboo` (docs/templates/bamboo/design.md, "Identity").
 *
 * Drawn for a BOTTOM-LEFT corner: a thin twig arcs up and to the right from
 * the corner, carrying six lanceolate blades in alternate pairs. `flip` mirrors it for a
 * bottom-right corner; callers may also rotate or vertically mirror it for a
 * top corner, and the fan reads well either way up.
 *
 * Fills ride `var(--bam-leaf)` / `var(--bam-leaf-deep)` and the midribs ride
 * `var(--bam-gold-bright)`, all derived in globals.css from the brand tokens so
 * theme presets recolor the sprig for free. No color literals here.
 *
 * `preserveAspectRatio="xMinYMax meet"` pins the art to the corner whatever box
 * the caller gives it. Callers own positioning and size (`absolute bottom-0
 * left-0 w-40 h-auto`).
 *
 * Hook-free and free of `"use client"` on purpose — server and client pages
 * both import it, matching `shared/bamboo-wave-divider.tsx`.
 */
export function BambooLeafSprig({
  className,
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 240 160"
      preserveAspectRatio="xMinYMax meet"
      className={cn(
        "pointer-events-none block",
        flip && "-scale-x-100",
        className,
      )}
    >
      {/* Twig, heavier where it leaves the corner, fining toward the tip. */}
      <path
        d={TWIG}
        fill="none"
        stroke="var(--bam-leaf-deep)"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <path
        d="M-2,162 C18,151 42,137 67,123"
        fill="none"
        stroke="var(--bam-leaf-deep)"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      {SPRIG_LEAVES.map((leaf, i) => (
        <g key={i} transform={leafTransform(leaf)}>
          <path
            d={leafPath(leaf.length, leaf.halfWidth, leaf.bend)}
            fill={`var(--bam-${leaf.tone})`}
          />
          {leaf.midrib && (
            <path
              d={midribPath(leaf.length, leaf.bend)}
              fill="none"
              stroke="var(--bam-gold-bright)"
              strokeOpacity={0.45}
              strokeWidth={1}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </g>
      ))}
      {/* Node collars where each blade pair meets the twig. */}
      {NODES.map(([cx, cy]) => (
        <ellipse
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          rx={2.6}
          ry={1.6}
          transform={`rotate(-33 ${cx} ${cy})`}
          fill="var(--bam-leaf-deep)"
        />
      ))}
    </svg>
  );
}

/**
 * BambooLeafGlyph — the tiny two-leaf ornament that sits in the break of a gold
 * rule (the mockup's headline rule). Fills with `currentColor`, so callers tint
 * it with a text utility, e.g. `text-[var(--bam-gold-bright)]` on green or
 * `text-[var(--bam-gold)]` on cream. Size it via className.
 */
export function BambooLeafGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 16"
      className={cn("pointer-events-none block h-4 w-6", className)}
    >
      <path
        d="M12,15.5 L12,12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={0.7}
        strokeLinecap="round"
      />
      <path
        transform="translate(11.4 13) rotate(-130)"
        d={leafPath(11.5, 2.9, -1.3)}
        fill="currentColor"
      />
      <path
        transform="translate(12.6 13) rotate(-50)"
        d={leafPath(11.5, 2.9, 1.3)}
        fill="currentColor"
      />
    </svg>
  );
}
