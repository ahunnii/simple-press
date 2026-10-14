/**
 * Balloon garland math for the `dream-balloons` color studio — PURE (no
 * React, no DOM), lifted from the approved prototype
 * (`docs/templates/dream/checkpoint/balloon-studio/index.html`, "GARLAND
 * LAYOUT" + "GARLAND SHADING").
 *
 * - 21 fixed slots along a gentle S-curve in a 640×360 viewBox (4 large,
 *   10 medium, 7 small accents), larges first so they draw behind.
 * - Palette colors are assigned per slot by a seeded draw: balanced quotas,
 *   least-clash with already-colored neighbours, larges first so every color
 *   gets a hero balloon when there are ≤ 4 of them. Same palette + shuffle
 *   counter → the same garland, on the server and in the browser.
 * - Finish shaders describe gradients as data; `dream-balloon-garland.tsx`
 *   turns them into real SVG elements.
 *
 * Also home to the finish keyword matcher the page uses to read a tile's
 * finish from its picture-choice GROUP label (the owner can rename groups;
 * "Pearl" / "Pearl finish" / "Pearls" all match).
 */

// ─── Finishes ───────────────────────────────────────────────────────────────

export const BALLOON_FINISHES = [
  "standard",
  "pearl",
  "pastel",
  "retro",
  "luster",
  "platinum",
  "crystal",
] as const;

export type BalloonFinish = (typeof BALLOON_FINISHES)[number];

/**
 * The finish a group label names, by keyword (first match in
 * `BALLOON_FINISHES` order after the specific ones), falling back to
 * `"standard"` — a glossy balloon is the safe default look.
 */
export function balloonFinishFromLabel(
  label: string | null | undefined,
): BalloonFinish {
  const text = (label ?? "").toLowerCase();
  // Specific finishes first: "Pearl Pastel" style hybrids read as the
  // shinier finish, and "standard" only ever matches itself.
  const order: BalloonFinish[] = [
    "platinum",
    "crystal",
    "luster",
    "pearl",
    "pastel",
    "retro",
    "standard",
  ];
  for (const finish of order) {
    if (text.includes(finish)) return finish;
  }
  // Common spellings / synonyms.
  if (text.includes("lustre")) return "luster";
  if (text.includes("chrome")) return "platinum";
  if (text.includes("clear")) return "crystal";
  return "standard";
}

/**
 * Neutral fill for a tile with no `color` (the `--dream-peach` token's
 * value): garland math needs a real hex; CSS dots use the token itself.
 */
export const NEUTRAL_BALLOON_HEX = "#f6e6d7";

/** A `#rrggbb` hex, or the neutral fallback for anything else. */
export function balloonHex(color: string | null | undefined): string {
  return typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)
    ? color.toLowerCase()
    : NEUTRAL_BALLOON_HEX;
}

// ─── Color utilities ────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb: readonly number[]): string {
  return (
    "#" +
    rgb
      .map((v) =>
        Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

/** Mix `hex` toward `other` by `t` (0 = hex, 1 = other). */
export function mixHex(hex: string, other: string, t: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  return rgbToHex(a.map((v, i) => v + (b[i]! - v) * t));
}

/** Rotate hue by `deg` (keeps lightness, nudges saturation) — Luster's second tone. */
export function rotateHue(hex: string, deg: number): string {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255) as [
    number,
    number,
    number,
  ];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  h = (h + deg + 360) % 360;
  s = Math.min(1, s + 0.12);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg = Math.floor(h / 60);
  const table: [number, number, number][] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  const [r1, g1, b1] = table[seg % 6]!;
  return rgbToHex([(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255]);
}

// ─── Layout ─────────────────────────────────────────────────────────────────

export const GARLAND_VIEWBOX = { width: 640, height: 360 } as const;
export const GARLAND_RADII = { large: 46, medium: 32, small: 16 } as const;

export type GarlandSize = keyof typeof GARLAND_RADII;

/**
 * [size, t along the spine (0..1), offset along the spine's normal
 * (+ = below the curve), tilt in degrees]. Larges first (drawn behind),
 * small accents last (drawn on top).
 */
export const GARLAND_SLOT_SPEC: readonly (readonly [
  GarlandSize,
  number,
  number,
  number,
])[] = [
  ["large", 0.12, 2, -8],
  ["large", 0.38, 4, 6],
  ["large", 0.62, -4, -6],
  ["large", 0.88, -2, 8],
  ["medium", -0.05, 6, -16],
  ["medium", 0.04, -34, -8],
  ["medium", 0.2, 34, 10],
  ["medium", 0.29, -36, -6],
  ["medium", 0.47, 32, 6],
  ["medium", 0.53, -32, -10],
  ["medium", 0.71, 36, 12],
  ["medium", 0.8, -34, -6],
  ["medium", 0.96, 34, 8],
  ["medium", 1.05, -6, 16],
  ["small", 0.02, 34, -10],
  ["small", 0.24, -44, -6],
  ["small", 0.33, 42, 8],
  ["small", 0.5, 0, 0],
  ["small", 0.67, -44, -8],
  ["small", 0.76, 42, 10],
  ["small", 0.98, -36, 6],
];

/** The garland's spine: an S lying on its side across the frame. */
export function garlandSpine(t: number): {
  x: number;
  y: number;
  nx: number;
  ny: number;
} {
  const x0 = 104;
  const span = 432;
  const amp = 52;
  const x = x0 + span * t;
  const y = 180 - amp * Math.sin(2 * Math.PI * t);
  const dx = span;
  const dy = -amp * 2 * Math.PI * Math.cos(2 * Math.PI * t);
  const len = Math.hypot(dx, dy);
  return { x, y, nx: -dy / len, ny: dx / len };
}

export type GarlandSlot = {
  index: number;
  size: GarlandSize;
  x: number;
  y: number;
  r: number;
  tilt: number;
};

/** Slot table in draw order. */
export function garlandSlots(): GarlandSlot[] {
  return GARLAND_SLOT_SPEC.map(([size, t, offset, tilt], index) => {
    const p = garlandSpine(t);
    return {
      index,
      size,
      x: Math.round((p.x + p.nx * offset) * 10) / 10,
      y: Math.round((p.y + p.ny * offset) * 10) / 10,
      r: GARLAND_RADII[size],
      tilt,
    };
  });
}

export type GarlandNeighbour = { index: number; weight: number };

/** Slots close enough that matching colors would read as a clump. */
export function garlandNeighbours(
  slots: readonly GarlandSlot[],
  factor = 1.6,
): GarlandNeighbour[][] {
  return slots.map((a) =>
    slots
      .filter(
        (b) =>
          b !== a && Math.hypot(a.x - b.x, a.y - b.y) < factor * (a.r + b.r),
      )
      .map((b) => ({
        index: b.index,
        weight: (a.r + b.r) / Math.hypot(a.x - b.x, a.y - b.y),
      })),
  );
}

/** Small, fast, seedable PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a over a string → 32-bit seed. */
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seed from the palette (order-independent) plus a shuffle counter. */
export function garlandSeed(ids: readonly string[], shuffle = 0): number {
  return hashString([...ids].sort().join("|") + "#" + shuffle);
}

/**
 * Assign palette colors to slots. Same palette + shuffle → same garland.
 * Counts are balanced (21 slots / n colors, the remainder handed out by a
 * seeded draw), each slot takes the color that clashes least with
 * already-colored neighbours, larges first so every color gets a hero
 * balloon when there are ≤ 4 of them. Returns one palette index per slot
 * (indexed by `slot.index`), or all `-1` for an empty palette.
 */
export function assignGarlandColors(
  slots: readonly GarlandSlot[],
  paletteSize: number,
  seed: number,
): number[] {
  if (paletteSize <= 0) return slots.map(() => -1);
  const rand = mulberry32(seed);
  const neighbours = garlandNeighbours(slots);
  const base = Math.floor(slots.length / paletteSize);
  const quota = Array.from({ length: paletteSize }, () => base);
  const order = Array.from({ length: paletteSize }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  for (let k = 0; k < slots.length - base * paletteSize; k++) {
    quota[order[k]!]!++;
  }

  const assigned = slots.map(() => -1);
  // Visit slots size-group by size-group, shuffled within each group.
  const groups = (["large", "medium", "small"] as const).map((size) =>
    slots.filter((s) => s.size === size).map((s) => s.index),
  );
  for (const group of groups) {
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [group[i], group[j]] = [group[j]!, group[i]!];
    }
    const usedInGroup = new Set<number>();
    for (const slotIndex of group) {
      let best = -1;
      let bestScore = Infinity;
      for (let c = 0; c < paletteSize; c++) {
        if (quota[c]! <= 0) continue;
        let clash = 0;
        for (const n of neighbours[slotIndex]!) {
          if (assigned[n.index] === c) clash += n.weight;
        }
        // Prefer colors not yet given a slot of this size, then quota left.
        const score =
          clash * 10 +
          (usedInGroup.has(c) ? 1.5 : 0) -
          quota[c]! * 0.25 +
          rand() * 0.2;
        if (score < bestScore) {
          bestScore = score;
          best = c;
        }
      }
      assigned[slotIndex] = best;
      quota[best]!--;
      usedInGroup.add(best);
    }
  }
  repairClashes(slots, neighbours, assigned);
  return assigned;
}

/**
 * Deterministic polish after the greedy pass (not in the prototype, whose
 * greedy draw occasionally left two OVERLAPPING balloons the same color):
 * swap colors between two slots of the same size whenever that lowers the
 * total clash. Swaps keep every quota and every color's large balloon.
 * Overlaps (centers closer than the radii sum) cost 10× a near-touch.
 */
function repairClashes(
  slots: readonly GarlandSlot[],
  neighbours: GarlandNeighbour[][],
  assigned: number[],
): void {
  const cost = (slotIndex: number, color: number) => {
    let total = 0;
    for (const n of neighbours[slotIndex]!) {
      if (assigned[n.index] === color)
        total += n.weight > 1 ? n.weight * 10 : n.weight;
    }
    return total;
  };
  for (let pass = 0; pass < 8; pass++) {
    let improved = false;
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i]!;
        const b = slots[j]!;
        if (a.size !== b.size) continue;
        const ca = assigned[a.index]!;
        const cb = assigned[b.index]!;
        if (ca === cb) continue;
        const before = cost(a.index, ca) + cost(b.index, cb);
        assigned[a.index] = cb;
        assigned[b.index] = ca;
        const after = cost(a.index, cb) + cost(b.index, ca);
        if (after + 1e-9 < before) {
          improved = true;
        } else {
          assigned[a.index] = ca;
          assigned[b.index] = cb;
        }
      }
    }
    if (!improved) break;
  }
}

// ─── Shading ────────────────────────────────────────────────────────────────

const WHITE = "#ffffff";
const BLACK = "#000000";

export type GradientStop = { offset: number; color: string; opacity?: number };

export type GarlandGradient =
  | {
      kind: "radial";
      id: string;
      stops: GradientStop[];
      cx: number;
      cy: number;
      r: number;
      fx?: number;
      fy?: number;
    }
  | {
      kind: "linear";
      id: string;
      stops: GradientStop[];
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };

/**
 * One finish recipe's output. `body` and `layers` are SVG paint values
 * (`url(#id)` or a hex); `layers` paint over the body in order.
 */
export type FinishShader = {
  defs: GarlandGradient[];
  body: string;
  bodyOpacity?: number;
  layers: string[];
  /** Platinum's sharp chrome highlight paint. */
  sharp?: string;
  /** Crystal's rim stroke color. */
  rim?: string;
  /** Opacity of the shared specular glint (0 = none). */
  spec: number;
};

function stop(offset: number, color: string, opacity = 1): GradientStop {
  return opacity === 1 ? { offset, color } : { offset, color, opacity };
}

function radial(
  id: string,
  stops: GradientStop[],
  {
    cx = 0.5,
    cy = 0.5,
    r = 0.5,
    fx,
    fy,
  }: { cx?: number; cy?: number; r?: number; fx?: number; fy?: number } = {},
): GarlandGradient {
  return { kind: "radial", id, stops, cx, cy, r, fx, fy };
}

function linear(
  id: string,
  stops: GradientStop[],
  {
    x1 = 0,
    y1 = 0,
    x2 = 1,
    y2 = 1,
  }: { x1?: number; y1?: number; x2?: number; y2?: number } = {},
): GarlandGradient {
  return { kind: "linear", id, stops, x1, y1, x2, y2 };
}

function matte(id: string, hex: string): FinishShader {
  return {
    defs: [
      radial(`${id}-h`, [stop(0, WHITE, 0.18), stop(1, WHITE, 0)], {
        cx: 0.36,
        cy: 0.3,
        r: 0.5,
      }),
    ],
    body: hex,
    layers: [`url(#${id}-h)`],
    spec: 0,
  };
}

/**
 * Finish recipes: standard = gloss highlight, pearl = iridescent sheen,
 * luster = satin with a hue-rotated second tone, platinum = chrome banding,
 * crystal = see-through body + rim, pastel/retro = matte.
 */
export const FINISH_SHADERS: Record<
  BalloonFinish,
  (id: string, hex: string) => FinishShader
> = {
  standard(id, hex) {
    return {
      defs: [
        radial(
          `${id}-b`,
          [
            stop(0, mixHex(hex, WHITE, 0.14)),
            stop(0.6, hex),
            stop(1, mixHex(hex, BLACK, 0.25)),
          ],
          { cx: 0.44, cy: 0.42, r: 0.64, fx: 0.36, fy: 0.3 },
        ),
        radial(
          `${id}-h`,
          [stop(0, WHITE, 0.55), stop(0.5, WHITE, 0.14), stop(1, WHITE, 0)],
          { cx: 0.34, cy: 0.27, r: 0.34 },
        ),
      ],
      body: `url(#${id}-b)`,
      layers: [`url(#${id}-h)`],
      spec: 0.75,
    };
  },
  pearl(id, hex) {
    return {
      defs: [
        radial(
          `${id}-b`,
          [
            stop(0, mixHex(hex, WHITE, 0.34)),
            stop(0.56, hex),
            stop(1, mixHex(hex, BLACK, 0.16)),
          ],
          { cx: 0.44, cy: 0.4, r: 0.66, fx: 0.38, fy: 0.3 },
        ),
        radial(
          `${id}-h`,
          [stop(0, WHITE, 0.42), stop(0.6, WHITE, 0.08), stop(1, WHITE, 0)],
          { cx: 0.38, cy: 0.3, r: 0.56 },
        ),
        linear(
          `${id}-i`,
          [
            stop(0, "#ffb3cf", 0.13),
            stop(0.5, "#fff2c9", 0.05),
            stop(1, "#a6ccff", 0.13),
          ],
          { x1: 0.1, y1: 0, x2: 0.9, y2: 1 },
        ),
      ],
      body: `url(#${id}-b)`,
      layers: [`url(#${id}-h)`, `url(#${id}-i)`],
      spec: 0.45,
    };
  },
  luster(id, hex) {
    const tone = rotateHue(hex, 38);
    return {
      defs: [
        radial(
          `${id}-b`,
          [
            stop(0, mixHex(hex, WHITE, 0.2)),
            stop(0.68, hex),
            stop(1, mixHex(hex, BLACK, 0.1)),
          ],
          { cx: 0.44, cy: 0.4, r: 0.68 },
        ),
        radial(
          `${id}-h`,
          [stop(0, WHITE, 0.28), stop(0.7, WHITE, 0.06), stop(1, WHITE, 0)],
          { cx: 0.38, cy: 0.32, r: 0.6 },
        ),
        linear(
          `${id}-i`,
          [stop(0, tone, 0), stop(0.55, tone, 0.06), stop(1, tone, 0.2)],
          { x1: 0.2, y1: 0.1, x2: 0.85, y2: 1 },
        ),
      ],
      body: `url(#${id}-b)`,
      layers: [`url(#${id}-h)`, `url(#${id}-i)`],
      spec: 0.3,
    };
  },
  platinum(id, hex) {
    const lt = (t: number) => mixHex(hex, WHITE, t);
    const dk = (t: number) => mixHex(hex, BLACK, t);
    return {
      defs: [
        linear(
          `${id}-b`,
          [
            stop(0, lt(0.5)),
            stop(0.16, hex),
            stop(0.3, dk(0.34)),
            stop(0.42, lt(0.42)),
            stop(0.56, hex),
            stop(0.7, dk(0.44)),
            stop(0.85, lt(0.3)),
            stop(1, dk(0.36)),
          ],
          { x1: 0.1, y1: 0, x2: 0.9, y2: 1 },
        ),
        radial(
          `${id}-h`,
          [stop(0, WHITE, 0.95), stop(0.45, WHITE, 0.85), stop(1, WHITE, 0)],
          { cx: 0.5, cy: 0.5, r: 0.5 },
        ),
        radial(`${id}-v`, [stop(0.62, BLACK, 0), stop(1, BLACK, 0.22)], {
          cx: 0.5,
          cy: 0.48,
          r: 0.56,
        }),
      ],
      body: `url(#${id}-b)`,
      layers: [`url(#${id}-v)`],
      sharp: `url(#${id}-h)`,
      spec: 0,
    };
  },
  crystal(id, hex) {
    return {
      defs: [
        radial(
          `${id}-g`,
          [stop(0, WHITE, 0.3), stop(0.6, WHITE, 0.05), stop(1, WHITE, 0)],
          { cx: 0.4, cy: 0.34, r: 0.55 },
        ),
      ],
      body: hex,
      bodyOpacity: 0.72,
      layers: [`url(#${id}-g)`],
      rim: mixHex(hex, BLACK, 0.28),
      spec: 0.9,
    };
  },
  pastel: matte,
  retro: matte,
};

/** The soft shared specular glint (one per garland). */
export function specGradient(id: string): GarlandGradient {
  return radial(id, [
    stop(0, WHITE, 1),
    stop(0.5, WHITE, 0.7),
    stop(1, WHITE, 0),
  ]);
}

const f2 = (n: number) => Math.round(n * 100) / 100;

/** Egg-shaped balloon path centred on (0,0): a touch taller than wide. */
export function balloonPath(r: number): string {
  const a = r * 1.0; // top
  const b = r * 1.1; // bottom (slightly pointier)
  const w = r * 0.92;
  return (
    `M0,${f2(-a)}` +
    `C${f2(w * 0.56)},${f2(-a)} ${f2(w)},${f2(-a * 0.52)} ${f2(w)},${f2(-a * 0.04)}` +
    `C${f2(w)},${f2(b * 0.5)} ${f2(w * 0.5)},${f2(b)} 0,${f2(b)}` +
    `C${f2(-w * 0.5)},${f2(b)} ${f2(-w)},${f2(b * 0.5)} ${f2(-w)},${f2(-a * 0.04)}` +
    `C${f2(-w)},${f2(-a * 0.52)} ${f2(-w * 0.56)},${f2(-a)} 0,${f2(-a)}Z`
  );
}

/** The little tied knot under a balloon. */
export function knotPath(r: number): string {
  const b = r * 1.1;
  const kw = Math.max(2.5, r * 0.11);
  const kh = Math.max(2.5, r * 0.12);
  return `M${f2(-kw * 0.45)},${f2(b - 0.5)} L${f2(kw * 0.45)},${f2(b - 0.5)} L${f2(kw)},${f2(b + kh)} L${f2(-kw)},${f2(b + kh)}Z`;
}

/** "A", "A and B", "A, B and C". */
export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}

// ─── Model ──────────────────────────────────────────────────────────────────

export type GarlandColor = {
  id: string;
  label: string;
  /** `#rrggbb`; missing → `NEUTRAL_BALLOON_HEX`. */
  hex?: string | null;
  finish: BalloonFinish;
};

export type GarlandBalloon = {
  slot: GarlandSlot;
  /** Draw order (0 = first), drives the staggered pop-in delay. */
  order: number;
  hex: string;
  shader: FinishShader;
  /** Knot fill (a darker body tone). */
  knot: string;
};

export type GarlandModel =
  | { kind: "empty"; title: string; slots: GarlandSlot[] }
  | {
      kind: "filled";
      title: string;
      defs: GarlandGradient[];
      shadowId: string;
      specId: string;
      balloons: GarlandBalloon[];
    };

/**
 * Everything the garland SVG needs, as data (the JSX port of the prototype's
 * `renderGarlandSvg`). `uid` namespaces every gradient/filter id so two
 * garlands on a page never collide — pass a sanitized `useId()`.
 */
export function buildGarlandModel(
  colors: readonly GarlandColor[],
  {
    uid,
    shuffle = 0,
    max = 6,
  }: { uid: string; shuffle?: number; max?: number },
): GarlandModel {
  const slots = garlandSlots();
  if (colors.length === 0) {
    return {
      kind: "empty",
      title: `Empty balloon garland — pick up to ${max} colors to fill it`,
      slots,
    };
  }

  const seed = garlandSeed(
    colors.map((c) => c.id),
    shuffle,
  );
  const assignment = assignGarlandColors(slots, colors.length, seed);

  const shadowId = `${uid}-shadow`;
  const specId = `${uid}-spec`;
  const defs: GarlandGradient[] = [specGradient(specId)];
  const shaders = colors.map((c, i) => {
    const hex = balloonHex(c.hex);
    const gid = `${uid}-${c.finish}-${hex.slice(1)}-${i}`;
    const shader = (FINISH_SHADERS[c.finish] ?? FINISH_SHADERS.standard)(
      gid,
      hex,
    );
    defs.push(...shader.defs);
    return { hex, shader };
  });

  const balloons = slots.map((slot, order) => {
    const ci = assignment[slot.index]!;
    const { hex, shader } = shaders[ci]!;
    return {
      slot,
      order,
      hex,
      shader,
      knot: mixHex(hex, BLACK, 0.22),
    };
  });

  return {
    kind: "filled",
    title: `Balloon garland sketch in ${listNames(colors.map((c) => c.label))}`,
    defs,
    shadowId,
    specId,
    balloons,
  };
}
