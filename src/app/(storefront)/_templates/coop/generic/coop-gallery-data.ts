import { z } from "zod";

import type { TemplateListRow } from "~/lib/template-fields";
import { parseTemplateListRows } from "~/lib/template-fields";

/**
 * Default content + per-slot layout data for the coop gallery page (MODE 1
 * of `CoopGenericPage`). Transcribed verbatim from the clone's
 * `project-gallery-page/page.tsx` (`Logo_data`/`Logo_styles` for the 12
 * full-width stacked photos, `Logo2_data`/`Logo2_styles` for the 4
 * aspect-ratio'd srcset photos — see `components/logo.tsx` / `logo2.tsx`
 * under `/Users/ahunn/Downloads/building-clone/src/app/project-gallery-page/`).
 *
 * Owner-editable state for both stacks is a `list` field of `{ image, alt }`
 * rows (see `./index.ts`, keys `coop.gallery.photos-a` / `-photos-b`) — NOT
 * a scalar `gallery` field. A scalar `gallery` field resolves to an
 * owner-managed DB `Gallery` record id with arbitrary length/order; it
 * cannot pin N specific default images with per-slot metadata. A `list`
 * field gives a fixed-length, index-addressable array the component can
 * `.map((row, i) => …)` and zip against the parallel per-index layout-class
 * arrays below (heights for stack A, aspect/srcSet for stack B) — exactly
 * the fallback mechanism the build brief anticipated.
 *
 * Per-slot layout metadata (stack A's height classes; stack B's aspect
 * ratio, padding-box classes, and responsive srcSet) is NOT owner-editable
 * — it's applied by row index regardless of which image is in that slot.
 * This matches design.md's "heights are the layout contract" rule: swapping
 * a photo keeps the page's layout stable. Indices beyond the template's
 * canned layout data (owner adds more rows than 12 / 4) clamp to the last
 * known slot's metadata.
 */

export type CoopGalleryPhotoRow = { image: string; alt: string };

function img(file: string): string {
  return `/templates/coop/images/${file}`;
}

/** Clamps `i` into `[0, length - 1]` — used to reuse the last slot's layout metadata for overflow rows. */
function clampIndex(i: number, length: number): number {
  return Math.min(Math.max(i, 0), length - 1);
}

// ─── Stack A — 12 full-width stacked photos (clone `Logo_data`) ────────────

export const STACK_A_DEFAULTS: CoopGalleryPhotoRow[] = [
  {
    image: img("5ca4c8a7f7a9.jpg"),
    alt: "Custom-built cabinets installed in a Canton restoration project",
  },
  {
    image: img("12a57c797d94.jpg"),
    alt: "Exterior of a restored home in Canton",
  },
  {
    image: img("2ad7b6ecf68c.jpg"),
    alt: "Custom decorative art created for a client project",
  },
  {
    image: img("55f53a6e3077.jpg"),
    alt: "Restored wooden door, finished for the Ashkee project",
  },
  {
    image: img("f2b312e2f3fd.jpg"),
    alt: "Restored hardwood floor in Dan and Carolina's home",
  },
  {
    image: img("5cfb52476f39.jpg"),
    alt: "Restored hardwood flooring in Julie's home",
  },
  {
    image: img("fdbba75c400f.jpeg"),
    alt: "Building Cooperatively restoration project photo",
  },
  {
    image: img("297d17c3d6e8.jpg"),
    alt: "Restoration project, after completion",
  },
  {
    image: img("4e47aec238d4.jpg"),
    alt: "Restoration project, after completion",
  },
  {
    image: img("b02cfd96eb90.jpg"),
    alt: "Detail photo of a finished restoration piece",
  },
  {
    image: img("7dc395847044.jpg"),
    alt: "Restored window, after completion",
  },
  {
    image: img("22930f5365f1.jpg"),
    alt: "Restored window frame detail",
  },
];

/** `Logo_styles[i].className` — breakpoints rewritten per design.md Port rule 1. */
const STACK_A_HEIGHT_CLASSES: string[] = [
  "h-174.5 max-coop-md:h-[15.6875rem] coop-md:max-coop-lg:h-130.5 coop-2xl:h-[63.3125rem]",
  "h-[34.9375rem] max-coop-md:h-[12.5625rem] coop-md:max-coop-lg:h-104.5 coop-2xl:h-203",
  "h-232.5 max-coop-md:h-[20.9375rem] coop-md:max-coop-lg:h-174 coop-2xl:h-337.5",
  "h-310 max-coop-md:h-[27.9375rem] coop-md:max-coop-lg:h-232 coop-2xl:h-450",
  "h-354 max-coop-md:h-127.5 coop-md:max-coop-lg:h-265 coop-2xl:h-514",
  "h-359.5 max-coop-md:h-129.5 coop-md:max-coop-lg:h-[67.3125rem] coop-2xl:h-522",
  "h-310 max-coop-md:h-[27.9375rem] coop-md:max-coop-lg:h-232 coop-2xl:h-450",
  "h-[72.9375rem] max-coop-md:h-105 coop-md:max-coop-lg:h-[54.5625rem] coop-2xl:h-[105.8125rem]",
  "h-[83.5625rem] max-coop-md:h-120.5 coop-md:max-coop-lg:h-[62.5625rem] coop-2xl:h-[121.3125rem]",
  "h-310 max-coop-md:h-[27.9375rem] coop-md:max-coop-lg:h-232 coop-2xl:h-450",
  "h-[72.6875rem] max-coop-md:h-[26.1875rem] coop-md:max-coop-lg:h-217.5 coop-2xl:h-422",
  "h-310 max-coop-md:h-[27.9375rem] coop-md:max-coop-lg:h-232 coop-2xl:h-[112.5625rem]",
];

const photoRowSchema = z
  .object({ image: z.string(), alt: z.string().optional() })
  .passthrough();

function parsePhotoRows(
  raw: unknown,
  defaults: CoopGalleryPhotoRow[],
): CoopGalleryPhotoRow[] {
  const rows: TemplateListRow[] = parseTemplateListRows(raw);
  if (rows.length === 0) return defaults;

  const out: CoopGalleryPhotoRow[] = [];
  for (const row of rows) {
    const parsed = photoRowSchema.safeParse(row);
    if (!parsed.success || !parsed.data.image) continue;
    out.push({ image: parsed.data.image, alt: parsed.data.alt ?? "" });
  }
  return out.length > 0 ? out : defaults;
}

export function parseStackAPhotos(raw: unknown): CoopGalleryPhotoRow[] {
  return parsePhotoRows(raw, STACK_A_DEFAULTS);
}

export function heightClassForStackA(i: number): string {
  const clamped = clampIndex(i, STACK_A_HEIGHT_CLASSES.length);
  return STACK_A_HEIGHT_CLASSES[clamped] ?? "";
}

// ─── Stack B — 4 aspect-ratio'd srcset photos (clone `Logo2_data`) ─────────

/**
 * Stack B rows carry a non-empty default `alt` — a deliberate, sanctioned
 * deviation from the clone, which hardcodes `alt=""` on these four images.
 * Repo convention (hard rule: "never empty for meaningful photos") wins here
 * because `alt` has zero visual footprint — it doesn't affect pixel-exact
 * rendering, only accessibility. The four photos are otherwise
 * indistinguishable restoration-project shots without a specific caption in
 * the source, so the copy is intentionally generic rather than inventing
 * false specifics.
 */
export const STACK_B_DEFAULTS: CoopGalleryPhotoRow[] = [
  {
    image: img("a7b55ec813cb.jpg"),
    alt: "Building Cooperatively restoration project photo",
  },
  {
    image: img("5df003080256.jpg"),
    alt: "Building Cooperatively restoration project photo",
  },
  {
    image: img("c846743563e5.jpg"),
    alt: "Building Cooperatively restoration project photo",
  },
  {
    image: img("4a6c2656b1a4.jpg"),
    alt: "Building Cooperatively restoration project photo",
  },
];

type StackBAsset = {
  imgSrc: string;
  srcSet: string;
  width: string;
  height: string;
  /** Logo2_styles[i].className — figure max-width wrapper. */
  className: string;
  /** Logo2_styles[i].className2 — aspect-box padding-bottom trick. */
  className2: string;
  /** Logo2_styles[i].className3 — aspect-ratio utility on the <img>. */
  className3: string;
};

/** `Logo2_data` + `Logo2_styles`, breakpoints rewritten per Port rule 1. */
const STACK_B_ASSETS: StackBAsset[] = [
  {
    imgSrc: img("a7b55ec813cb.jpg"),
    srcSet: [
      `${img("dff332ab0b01.jpg")} 100w`,
      `${img("b09c34aa2010.jpg")} 300w`,
      `${img("54383e4e2891.jpg")} 500w`,
      `${img("ba6e047380c7.jpg")} 750w`,
      `${img("7584d21a14b2.jpg")} 1000w`,
      `${img("81e2e1175735.jpg")} 1500w`,
      `${img("a93b3e180b10.jpg")} 2500w`,
    ].join(", "),
    width: "4032",
    height: "3024",
    className: "max-w-1008",
    className2:
      "pb-[697.5px] max-coop-md:pb-[251.3px] coop-md:max-coop-lg:pb-130.5 coop-2xl:pb-[1012.5px]",
    className3: "aspect-[auto_4032/3024]",
  },
  {
    imgSrc: img("5df003080256.jpg"),
    srcSet: [
      `${img("0b97596ddf53.jpg")} 100w`,
      `${img("aeb6bc2a6fce.jpg")} 300w`,
      `${img("72a388502210.jpg")} 500w`,
      `${img("22f8cba03b50.jpg")} 750w`,
      `${img("439e262bfd8e.jpg")} 1000w`,
      `${img("9edf7b4a87f0.jpg")} 1500w`,
      `${img("42eac9d5df2b.jpg")} 2500w`,
    ].join(", "),
    width: "1600",
    height: "1200",
    className: "max-w-400",
    className2:
      "pb-[697.5px] max-coop-md:pb-[251.3px] coop-md:max-coop-lg:pb-130.5 coop-2xl:pb-[1012.5px]",
    className3: "aspect-[auto_1600/1200]",
  },
  {
    imgSrc: img("c846743563e5.jpg"),
    srcSet: [
      `${img("e97b7c57325e.jpg")} 100w`,
      `${img("b974a28e0ca4.jpg")} 300w`,
      `${img("be38b2447169.jpg")} 500w`,
      `${img("27ca2f5fc072.jpg")} 750w`,
      `${img("f8534e81209b.jpg")} 1000w`,
      `${img("4b5e69246f33.jpg")} 1500w`,
      `${img("6846df42f698.jpg")} 2500w`,
    ].join(", "),
    width: "3036",
    height: "4048",
    className: "max-w-759",
    className2:
      "pb-310 max-coop-md:pb-[446.7px] coop-md:max-coop-lg:pb-232 coop-2xl:pb-450",
    className3: "aspect-[auto_3036/4048]",
  },
  {
    imgSrc: img("4a6c2656b1a4.jpg"),
    srcSet: [
      `${img("1de25608215d.jpg")} 100w`,
      `${img("1bed9f71f790.jpg")} 300w`,
      `${img("5b30ea78a202.jpg")} 500w`,
      `${img("50c2eaf4efec.jpg")} 750w`,
      `${img("6c8b62ea0500.jpg")} 1000w`,
      `${img("bff377b029fe.jpg")} 1500w`,
      `${img("c8613a222730.jpg")} 2500w`,
    ].join(", "),
    width: "2048",
    height: "1536",
    className: "max-w-512",
    className2:
      "pb-[697.5px] max-coop-md:pb-[251.3px] coop-md:max-coop-lg:pb-130.5 coop-2xl:pb-[1012.5px]",
    className3: "aspect-[auto_2048/1536]",
  },
];

export function parseStackBPhotos(raw: unknown): CoopGalleryPhotoRow[] {
  return parsePhotoRows(raw, STACK_B_DEFAULTS);
}

/**
 * Resolves the per-slot asset metadata (srcSet/width/height/layout classes)
 * for a stack-B row at index `i`, clamping to the last known slot for
 * indices beyond the template's 4 canned assets. The multi-width `srcSet`
 * is only returned when the row's image is untouched from its shipped
 * default — there's no way to derive alternate resolutions for an
 * owner-uploaded replacement, so a swapped photo falls back to plain `src`
 * (browser-scaled) while keeping the same aspect/layout classes.
 */
export function stackBAssetFor(
  row: CoopGalleryPhotoRow,
  i: number,
): StackBAsset & { srcSetToUse: string | undefined } {
  const clamped = clampIndex(i, STACK_B_ASSETS.length);
  const asset = STACK_B_ASSETS[clamped];
  if (!asset) {
    // Unreachable: STACK_B_ASSETS is a fixed non-empty literal and `clamped`
    // is always within [0, STACK_B_ASSETS.length - 1].
    throw new Error("coop: STACK_B_ASSETS unexpectedly empty");
  }
  const isDefaultImage = row.image === asset.imgSrc;
  return { ...asset, srcSetToUse: isDefaultImage ? asset.srcSet : undefined };
}
