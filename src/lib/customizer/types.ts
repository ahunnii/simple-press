/**
 * Product customizer types.
 *
 * ISOMORPHIC: imported by the storefront (live totals), the server (the
 * authority: checkout, webhook, order display) and the admin editor. No
 * server-only imports here, and deliberately no `@prisma/client` imports: the
 * DB loader (a later phase) maps Prisma rows INTO these shapes, so this
 * library never depends on the generated client.
 *
 * Three layers, mirroring the quote calculator (`src/lib/quote/`):
 *
 * 1. `CustomizerDefinition` — the FULL server-side definition for one
 *    product: groups attached to it, their values, and for linked values the
 *    resolved product/variant (name, sku, price, stock). Never sent to a
 *    browser.
 * 2. `PublicCustomizerDefinition` — what the storefront gets
 *    (`toPublicCustomizerDefinition`): one effective price per value, an
 *    `available` flag and a CAPPED `maxQty`. No link ids, names, skus or raw
 *    stock counts.
 * 3. `CustomizerSelection` — the wire format the shopper posts back: ids and
 *    raw engraving text only. The server re-prices it against (1); nothing
 *    the client sends can introduce a price.
 *
 * All money is integer cents.
 */

/** Hard ceiling on any text option, whatever the owner configures. */
export const CUSTOMIZER_TEXT_MAX_LENGTH = 500;

/** `CustomizationSnapshot.summary` never exceeds this many characters. */
export const CUSTOMIZER_SUMMARY_MAX_LENGTH = 480;

/**
 * `PublicCustomizerValue.maxQty` is clamped to this, so the storefront never
 * learns a stock count above it. A public `maxQty` EQUAL to the cap therefore
 * means "at least this many" — client-side checks treat it as unlimited and
 * leave the final word to the server.
 */
export const CUSTOMIZER_PUBLIC_MAX_QTY_CAP = 99;

/** Wire-format bounds (enforced by `customizerSelectionSchema`). */
export const CUSTOMIZER_MAX_GROUPS = 30;
export const CUSTOMIZER_MAX_VALUES_PER_GROUP = 60;
export const CUSTOMIZER_MAX_ID_LENGTH = 64;
export const CUSTOMIZER_MAX_RAW_TEXT_LENGTH = 2000;

export type CustomizerGroupKind = "choice" | "text";
export type CustomizerGroupDisplay = "tiles" | "swatches" | "list";

/**
 * The product/variant a value is linked to, resolved by the loader. A linked
 * value takes its price (unless overridden) and stock from this target, and
 * a sale decrements the target's stock.
 */
export type CustomizerLinkedTarget = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string | null;
  /** Cents, already resolved via `resolveVariantPrice`. */
  price: number;
  /** Target exists, is not "coming soon", and the variant (if any) is valid. */
  available: boolean;
  /**
   * `null` = untracked / backorders allowed. Otherwise the quantity that can
   * still be sold, pool logic included (computed by the loader).
   */
  stock: number | null;
};

export type CustomizerValueDef = {
  id: string;
  label: string;
  imageUrl: string | null;
  /** `#rrggbb`, lower-case. */
  swatchColor: string | null;
  /** Add-on price in cents for a STANDALONE value. Ignored when linked. */
  priceDelta: number;
  /** Linked values only: charge this instead of the target's price. */
  priceOverride: number | null;
  linked: CustomizerLinkedTarget | null;
  /** The owner's "available" toggle. */
  available: boolean;
  sortOrder: number;
};

export type CustomizerGroupDef = {
  id: string;
  name: string;
  helpText: string | null;
  kind: CustomizerGroupKind;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  /** The N cheapest picks in this group are free ("first charm included"). */
  includedCount: number;
  display: CustomizerGroupDisplay;
  /** Text groups: owner limit, clamped to `CUSTOMIZER_TEXT_MAX_LENGTH`. */
  maxLength: number | null;
  placeholder: string | null;
  /** Text groups: charged only when the shopper actually fills the text. */
  textPriceCents: number;
  /** Product attachment order. */
  sortOrder: number;
  values: CustomizerValueDef[];
};

export type CustomizerDefinition = {
  productId: string;
  groups: CustomizerGroupDef[];
};

export type PublicCustomizerValue = {
  id: string;
  label: string;
  imageUrl: string | null;
  swatchColor: string | null;
  /** Effective add-on price in cents (see `effectiveValuePrice`). */
  price: number;
  /** Owner toggle AND (if linked) target available and not sold out. */
  available: boolean;
  /**
   * Most of this value one line may use, clamped to
   * `CUSTOMIZER_PUBLIC_MAX_QTY_CAP`. `null` = unlimited.
   */
  maxQty: number | null;
  sortOrder: number;
};

export type PublicCustomizerGroup = Omit<CustomizerGroupDef, "values"> & {
  values: PublicCustomizerValue[];
};

export type PublicCustomizerDefinition = {
  productId: string;
  groups: PublicCustomizerGroup[];
};

/** Wire format: ids and raw text only. */
export type CustomizerSelection = {
  choices: { groupId: string; valueIds: string[] }[];
  texts: { groupId: string; text: string }[];
};

export type CustomizerErrorCode =
  | "unknown-group"
  | "unknown-value"
  /** Same value id listed twice in one group. */
  | "duplicate-value"
  /** Wrong shape for the group: text for a choice group, choices for a text group, a group listed twice. */
  | "invalid-selection"
  | "required"
  | "too-few"
  | "too-many"
  | "value-unavailable"
  | "value-out-of-stock"
  | "text-too-long";

export type CustomizerError = {
  code: CustomizerErrorCode;
  groupId?: string;
  valueId?: string;
  /** Shopper-facing, e.g. "Choose up to 3 charms". */
  message: string;
};

export type CustomizationSnapshotSelection = {
  valueId: string;
  label: string;
  imageUrl: string | null;
  swatchColor: string | null;
  /** Charged cents per unit (0 when `included`). */
  price: number;
  included: boolean;
  linkedProductId: string | null;
  linkedVariantId: string | null;
  sku: string | null;
};

export type CustomizationSnapshotGroup = {
  groupId: string;
  name: string;
  kind: CustomizerGroupKind;
  selections?: CustomizationSnapshotSelection[];
  text?: string;
  /** Text groups: the charged text price (cents). */
  price?: number;
};

/**
 * One stocked unit consumed per configured unit. Expanded × line quantity
 * for reservation, deduction and restock — so those work from the order
 * alone, even after the owner edits or deletes the option.
 */
export type CustomizationComponent = {
  productId: string;
  variantId: string | null;
  qtyPerUnit: number;
  name: string;
};

/**
 * Stored on `OrderItem.customization`. Versioned: readers must check `v`.
 * Everything a fulfiller, email or restock needs, frozen at purchase time.
 */
export type CustomizationSnapshot = {
  v: 1;
  /** Product/variant unit price before add-ons (cents). */
  basePrice: number;
  /** Sum of charged add-ons per unit (cents). */
  addOnTotal: number;
  /** One-line human summary, ≤ `CUSTOMIZER_SUMMARY_MAX_LENGTH` chars. */
  summary: string;
  groups: CustomizationSnapshotGroup[];
  components: CustomizationComponent[];
};
