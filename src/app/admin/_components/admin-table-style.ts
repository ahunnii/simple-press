/**
 * Shared type and density for admin data tables.
 *
 * The shadcn `Table` primitives default to `p-2` cells and normal-case
 * `text-foreground` headers — the same size and colour as the data beneath them,
 * differing only in weight, which is why an unstyled header row reads like a
 * first data row. The house treatment (set by Products, Orders, Customers, and
 * Inventory) differentiates headers by STYLE — 12px uppercase micro-caps, muted —
 * so they can never be mistaken for content, and keeps cells at the primitive's
 * 14px, the right density for a surface people scan rather than read.
 *
 * Applied per-cell rather than via `[&_td]:…` on the table: descendant selectors
 * outrank plain classes, so an arbitrary-variant approach would silently defeat
 * any per-cell override.
 *
 * `--muted-foreground` is ~4.9:1 on the light background — passes WCAG AA for
 * normal text, with little margin. Don't lighten it.
 *
 * These live here rather than in `~/components/ui/table.tsx` deliberately: all
 * 11 consumers of that primitive are admin or platform-hub surfaces, so folding
 * these in would be safe, but it would restyle nine tables nobody reviewed.
 * Opting in per table keeps the blast radius at zero.
 */
export const TABLE_HEAD =
  "text-muted-foreground px-6 py-3 text-xs font-medium tracking-wider uppercase";

export const TABLE_CELL = "px-6 py-4";

/**
 * Narrow control columns — a checkbox, a lone icon button — sit tighter, so the
 * control doesn't drift away from the row it belongs to. Same exception Products
 * makes for its select column.
 *
 * Despite the name mirroring `TABLE_HEAD`, this does NOT also carry that
 * constant's micro-caps typography (`text-muted-foreground` + uppercase +
 * tracking) — every remaining consumer is a checkbox column with `sr-only`
 * header text, so the typography was never visible and folding it in here is
 * harmless. Actions columns (a lone icon button, with visible content) use the
 * full `TABLE_HEAD`/`TABLE_CELL` instead — see Services/Collections/Inventory.
 */
export const TABLE_HEAD_TIGHT =
  "text-muted-foreground px-4 py-3 text-xs font-medium tracking-wider uppercase";
export const TABLE_CELL_TIGHT = "px-4 py-4";

/**
 * "Needs attention, but not broken" — a low stock level, a published collection
 * with nothing visible on it. Carries a dark-mode pair, which the hand-rolled
 * `text-amber-600` usages scattered through the admin do not.
 */
export const WARNING_TEXT = "text-amber-600 dark:text-amber-400";

/** "Broken now" — zero stock, a hard failure. Distinct from WARNING_TEXT. */
export const DANGER_TEXT = "text-destructive";

/**
 * "Good news" — a positive inventory delta (restock, return reversed). Carries
 * a dark-mode pair, the same treatment as `WARNING_TEXT`. Distinct from the
 * `success` Badge variant's background-tinted look; this is text-only, for
 * inline numbers like a ledger's `+N` delta.
 */
export const SUCCESS_TEXT = "text-emerald-600 dark:text-emerald-400";

/**
 * The `Card` wrapping a full-bleed admin table.
 *
 * `py-0` kills Card's default 24px vertical padding: the table is full-bleed
 * horizontally, so that padding rendered as white gutters above the header and
 * below the last row — visible as banding the moment a row picks up a
 * selected/hover background. `overflow-hidden` then clips the first and last row
 * backgrounds to the card's rounded corners.
 *
 * Apply as `<Card className={TABLE_CARD}>`; every admin table wants both, and
 * dropping either one is a visible regression rather than a style preference.
 */
export const TABLE_CARD = "overflow-hidden py-0";
