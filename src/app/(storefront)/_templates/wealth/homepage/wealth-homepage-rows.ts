import { parseTemplateListRows } from "~/lib/template-fields";

/**
 * Runtime row parsers for the wealth homepage's list fields.
 *
 * Kept out of `./index.ts` on purpose: `parseTemplateListRows` is a RUNTIME
 * import from `~/lib/template-fields`, which aggregates every template's root
 * `index.ts` — including this template's, which imports `./index.ts`. Importing
 * it from the field module would be the same circular-evaluation TDZ crash
 * documented in `./wealth-homepage-news.ts`.
 */

function readString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value.trim() : "";
}

// ─── By the numbers ─────────────────────────────────────────────────────────

export type WealthStatRow = {
  value: string;
  caption: string;
  /** Position in the SAVED list — what the editor's row targeting expects. */
  sourceIndex: number;
};

/**
 * `wealth.homepage.stats-items` → at most 3 rows. A row without a number is
 * dropped (a caption alone is not a stat). No fallback rows exist: an empty
 * result means the whole section must not render.
 */
export function toWealthStatRows(raw: unknown): WealthStatRow[] {
  return parseTemplateListRows(raw)
    .map((row, sourceIndex) => ({
      value: readString(row, "value"),
      caption: readString(row, "caption"),
      sourceIndex,
    }))
    .filter((row) => row.value !== "")
    .slice(0, 3);
}

// ─── Co-op logo strip ───────────────────────────────────────────────────────

export type WealthCoopLogoRow = {
  src: string;
  name: string;
  url: string;
  sourceIndex: number;
};

/**
 * Built-in example co-ops (the six marks the approved mock shows), used while
 * the owner has saved no logos. A homepage-local copy of the first entries of
 * `testimonials/wealth-testimonials-page.tsx`'s DEFAULT_COOPS (that constant
 * is not exported); names match.
 */
export const WEALTH_COOP_LOGO_FALLBACK: WealthCoopLogoRow[] = [
  {
    src: "/templates/wealth/images/coop-logo-1.png",
    name: "Stuffed Detroit",
    url: "",
    sourceIndex: -1,
  },
  {
    src: "/templates/wealth/images/coop-logo-2.png",
    name: "Black Bottom Garden Center",
    url: "",
    sourceIndex: -1,
  },
  {
    src: "/templates/wealth/images/coop-logo-3.png",
    name: "Brick and Mortar Cooperative",
    url: "http://brickandmortar.che.coop/about/",
    sourceIndex: -1,
  },
  {
    src: "/templates/wealth/images/coop-logo-4.png",
    name: "Building Cooperatively",
    url: "https://www.buildingcooperatively.com/",
    sourceIndex: -1,
  },
  {
    src: "/templates/wealth/images/coop-logo-5.png",
    name: "The Spoons Consultancy",
    url: "https://thespoonsconsultancy.com/",
    sourceIndex: -1,
  },
  {
    src: "/templates/wealth/images/coop-logo-7.png",
    name: "Handy Relocations",
    url: "",
    sourceIndex: -1,
  },
];

/**
 * The Testimonials page's saved `wealth.testimonials.coops` list (logo / name /
 * url rows) → the homepage strip. Rows without a logo are dropped; an empty
 * result falls back to the built-in example co-ops (same as that page).
 */
export function toWealthCoopLogoRows(raw: unknown): WealthCoopLogoRow[] {
  const rows = parseTemplateListRows(raw)
    .map((row, sourceIndex) => ({
      src: readString(row, "logo"),
      name: readString(row, "name"),
      url: readString(row, "url"),
      sourceIndex,
    }))
    .filter((row) => row.src !== "")
    .slice(0, 12);
  return rows.length > 0 ? rows : WEALTH_COOP_LOGO_FALLBACK;
}
