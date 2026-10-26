import { z } from "zod";

import {
  localDeliveryBandSchema,
  MAX_LOCAL_DELIVERY_BANDS,
  parseLocalDeliveryBands,
} from "~/lib/local-delivery-bands";

export const shippingFormSchema = z
  .object({
    shippingType: z.enum([
      "free",
      "flat_rate",
      "flat_rate_with_threshold",
      "zone_weight",
    ]),
    shippingFlatRateDollars: z.string().optional(),
    freeShippingThresholdDollars: z.string().optional(),
    offersInStorePickup: z.boolean(),
    salesCountries: z.array(z.enum(["CA", "MX"])),
    pickupLocation: z.string().optional(),
    pickupInstructions: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.shippingType === "flat_rate" ||
      data.shippingType === "flat_rate_with_threshold"
    ) {
      const raw = data.shippingFlatRateDollars?.trim() ?? "";
      if (
        !raw ||
        Number.isNaN(Number.parseFloat(raw)) ||
        Number.parseFloat(raw) < 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid flat rate amount",
          path: ["shippingFlatRateDollars"],
        });
      }
    }
    if (data.shippingType === "flat_rate_with_threshold") {
      const raw = data.freeShippingThresholdDollars?.trim() ?? "";
      if (
        !raw ||
        Number.isNaN(Number.parseFloat(raw)) ||
        Number.parseFloat(raw) <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid free shipping threshold",
          path: ["freeShippingThresholdDollars"],
        });
      }
    }
    if (data.offersInStorePickup === true) {
      if (!data.pickupInstructions?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Add pickup hours/instructions so customers know when to collect their order",
          path: ["pickupInstructions"],
        });
      }
    }
  });

export type ShippingFormValues = z.infer<typeof shippingFormSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Zone + weight shipping schema
//
// Money fields use dollar strings (e.g. "6.99") consistent with shippingFormSchema
// above.  The matrix editor will display dollars; the tRPC mutation converts to
// cents before persisting.  This keeps the form ergonomic for owners.
// ──────────────────────────────────────────────────────────────────────────────

/** Parse a dollar-string into a non-negative float, or return null on failure. */
function parseDollarString(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

const weightTierSchema = z
  .object({
    label: z.string().min(1, "Tier label is required"),
    minLb: z.number().nonnegative("Min weight must be ≥ 0"),
    // maxLb: null signals the open-ended top tier
    maxLb: z.number().positive("Max weight must be > 0").nullable(),
  })
  .refine(
    (t) => t.maxLb === null || t.maxLb > t.minLb,
    "Max weight must be greater than min weight",
  );

const zoneRateRowSchema = z.object({
  name: z.string().min(1, "Zone name is required"),
  states: z
    .array(z.string().length(2))
    .min(1, "Each zone must have at least one state"),
  /**
   * Rate cells: indexed by tier position (0-based string key because HTML inputs
   * always produce string keys).  Values are dollar strings ("6.99").
   * The matrix editor renders a grid of <input type="text"> cells.
   */
  rateDollars: z.record(z.string(), z.string()),
});

export const zoneWeightFormSchema = z
  .object({
    originState: z
      .string()
      .length(2, "Origin state must be a 2-letter US state code")
      .regex(/^[A-Za-z]{2}$/, "Origin state must contain only letters"),

    weightTiers: z
      .array(weightTierSchema)
      .min(1, "At least one weight tier is required"),

    zones: z.array(zoneRateRowSchema).min(1, "At least one zone is required"),

    /**
     * Fallback rate in dollars — applied when the destination state matches
     * no zone (e.g. non-US or a state not yet assigned).
     */
    fallbackRateDollars: z.string(),

    /**
     * Optional free-shipping threshold in dollars.  Empty string = no threshold.
     */
    freeShippingThresholdDollars: z.string().optional(),

    /** Assumed weight (lb) for products that have no weight value set. */
    defaultItemWeightLb: z.number().nonnegative().default(0),

    /**
     * Mode-independent settings that live on the flat-rate form but must persist
     * for zone+weight businesses too (otherwise the toolbar save would drop them).
     */
    offersInStorePickup: z.boolean().default(false),
    /** Country allowlist — opt-in extras beyond US ("US" is always allowed). */
    salesCountries: z.array(z.enum(["CA", "MX"])).default([]),
    pickupLocation: z.string().optional(),
    pickupInstructions: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // ── Weight tiers: ascending + contiguous bounds ──────────────────────────
    const tiers = data.weightTiers;
    for (let i = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      if (tier === undefined) continue;

      // All tiers except the last must have a finite maxLb
      if (i < tiers.length - 1 && tier.maxLb === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Only the last weight tier may have an open-ended max",
          path: ["weightTiers", i, "maxLb"],
        });
      }

      // Each tier's minLb must match the previous tier's maxLb (contiguous)
      if (i > 0) {
        const prev = tiers[i - 1];
        if (
          prev !== undefined &&
          prev.maxLb !== null &&
          tier.minLb !== prev.maxLb
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Tier ${i + 1} minLb (${tier.minLb}) must equal the previous tier's maxLb (${prev.maxLb})`,
            path: ["weightTiers", i, "minLb"],
          });
        }
      }
    }

    // ── State uniqueness: no state in more than one zone ─────────────────────
    const seen = new Map<string, string>(); // stateCode → zone name
    for (const zone of data.zones) {
      for (const state of zone.states) {
        const upper = state.toUpperCase();
        const existing = seen.get(upper);
        if (existing) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `State "${upper}" is assigned to both "${existing}" and "${zone.name}"`,
            path: ["zones"],
          });
        } else {
          seen.set(upper, zone.name);
        }
      }
    }

    // ── Rate cells: each cell must be a non-negative dollar string ────────────
    data.zones.forEach((zone, zoneIdx) => {
      Object.entries(zone.rateDollars).forEach(([tierKey, dollarStr]) => {
        if (parseDollarString(dollarStr) === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Zone "${zone.name}" tier ${Number(tierKey) + 1}: enter a valid rate (e.g. "6.99")`,
            path: ["zones", zoneIdx, "rateDollars", tierKey],
          });
        }
      });
    });

    // ── Fallback rate ─────────────────────────────────────────────────────────
    if (parseDollarString(data.fallbackRateDollars) === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid fallback rate (e.g. "19.99")',
        path: ["fallbackRateDollars"],
      });
    }

    // ── Free-shipping threshold (optional) ────────────────────────────────────
    const thresholdRaw = data.freeShippingThresholdDollars?.trim() ?? "";
    if (thresholdRaw !== "") {
      const parsed = parseDollarString(thresholdRaw);
      if (parsed === null || parsed <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid free-shipping threshold greater than $0",
          path: ["freeShippingThresholdDollars"],
        });
      }
    }

    // ── In-store pickup instructions (required when pickup is enabled) ─────────
    if (data.offersInStorePickup === true) {
      if (!data.pickupInstructions?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Add pickup hours/instructions so customers know when to collect their order",
          path: ["pickupInstructions"],
        });
      }
    }
  });

export type ZoneWeightFormValues = z.infer<typeof zoneWeightFormSchema>;

// ──────────────────────────────────────────────────────────────────────────────
// Delivery times + returns (feeds the Google Merchant listing structured data)
//
// Two schemas over the same rules:
//   • deliveryReturnsFormSchema  – what the admin form holds (strings for the
//     number inputs, the return fee in dollars, plus a three-way returnsMode).
//   • deliveryReturnsInputSchema – the wire format for
//     business.updateDeliveryAndReturns (ints / cents / nulls).
// `returnWindowDays` is tri-state on the wire: null = never set (emit nothing),
// 0 = the store takes no returns, N = an N-day window.
// ──────────────────────────────────────────────────────────────────────────────

export const HANDLING_DAYS_MAX = 30;
export const TRANSIT_DAYS_MAX = 60;
export const RETURN_WINDOW_DAYS_MAX = 365;

export const RETURN_FEES = ["free", "customer_pays", "flat_fee"] as const;
export const RETURN_METHODS = ["by_mail", "in_store", "either"] as const;
export const RETURNS_MODES = ["unset", "none", "accept"] as const;

export type ReturnFees = (typeof RETURN_FEES)[number];
export type ReturnMethod = (typeof RETURN_METHODS)[number];
export type ReturnsMode = (typeof RETURNS_MODES)[number];

type DeliveryRangeKey = "handling" | "transit";

/** The normalised numbers both schemas hand to the shared rule check. */
type DeliveryReturnsParsed = {
  handlingDaysMin: number | null;
  handlingDaysMax: number | null;
  transitDaysMin: number | null;
  transitDaysMax: number | null;
  /** null = not set, 0 = no returns, N = accept returns. */
  returnWindowDays: number | null;
  returnFees: ReturnFees | null;
  returnShippingFeeCents: number | null;
  returnMethod: ReturnMethod | null;
};

type DeliveryReturnsIssueKey =
  | "handlingDaysMin"
  | "handlingDaysMax"
  | "transitDaysMin"
  | "transitDaysMax"
  | "returnWindowDays"
  | "returnFees"
  | "returnShippingFee"
  | "returnMethod";

/**
 * Rules shared by the form and the wire schema. `report` receives a logical
 * field key; each caller maps it to its own path. Range/bound violations on a
 * value the caller could not parse are reported by the caller, not here.
 */
function checkDeliveryReturns(
  v: DeliveryReturnsParsed,
  report: (key: DeliveryReturnsIssueKey, message: string) => void,
) {
  const ranges: Array<{
    key: DeliveryRangeKey;
    label: string;
    min: number | null;
    max: number | null;
    limit: number;
  }> = [
    {
      key: "handling",
      label: "Handling time",
      min: v.handlingDaysMin,
      max: v.handlingDaysMax,
      limit: HANDLING_DAYS_MAX,
    },
    {
      key: "transit",
      label: "Transit time",
      min: v.transitDaysMin,
      max: v.transitDaysMax,
      limit: TRANSIT_DAYS_MAX,
    },
  ];

  for (const r of ranges) {
    const minKey = `${r.key}DaysMin` as DeliveryReturnsIssueKey;
    const maxKey = `${r.key}DaysMax` as DeliveryReturnsIssueKey;
    if (r.min !== null && r.max === null) {
      report(maxKey, `Add a maximum for ${r.label.toLowerCase()}`);
    }
    if (r.max !== null && r.min === null) {
      report(minKey, `Add a minimum for ${r.label.toLowerCase()}`);
    }
    if (r.min !== null && r.max !== null && r.min > r.max) {
      report(maxKey, "Maximum must be at least the minimum");
    }
    if (r.min !== null && (r.min < 0 || r.min > r.limit)) {
      report(minKey, `Enter 0–${r.limit} days`);
    }
    if (r.max !== null && (r.max < 0 || r.max > r.limit)) {
      report(maxKey, `Enter 0–${r.limit} days`);
    }
  }

  const window = v.returnWindowDays;
  if (window !== null && (window < 0 || window > RETURN_WINDOW_DAYS_MAX)) {
    report(
      "returnWindowDays",
      `Enter a return window of 1–${RETURN_WINDOW_DAYS_MAX} days`,
    );
    return;
  }

  if (window !== null && window > 0) {
    if (v.returnFees === null) {
      report("returnFees", "Choose who pays for return shipping");
    }
    if (v.returnMethod === null) {
      report("returnMethod", "Choose how customers return items");
    }
    if (
      v.returnFees === "flat_fee" &&
      (v.returnShippingFeeCents === null || v.returnShippingFeeCents <= 0)
    ) {
      report("returnShippingFee", "Enter a return fee greater than $0");
    }
  }
}

// ── Form schema ──────────────────────────────────────────────────────────────

export const deliveryReturnsFormSchema = z
  .object({
    handlingDaysMin: z.string(),
    handlingDaysMax: z.string(),
    transitDaysMin: z.string(),
    transitDaysMax: z.string(),
    returnsMode: z.enum(RETURNS_MODES),
    returnWindowDays: z.string(),
    /** "" until the owner picks one. */
    returnFees: z.union([z.enum(RETURN_FEES), z.literal("")]),
    returnShippingFeeDollars: z.string(),
    /** "" until the owner picks one. */
    returnMethod: z.union([z.enum(RETURN_METHODS), z.literal("")]),
  })
  .superRefine((data, ctx) => {
    // First message per field wins, so a parse error ("1.5") is never
    // followed by a second, contradictory one from the shared rules.
    const reported = new Set<string>();
    const issue = (path: string, message: string) => {
      if (reported.has(path)) return;
      reported.add(path);
      ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });
    };

    // Whole-number inputs. A blank is "not set"; anything else must be digits.
    const parseInt0 = (raw: string, path: string): number | null => {
      const t = raw.trim();
      if (t === "") return null;
      if (!/^\d+$/.test(t)) {
        issue(path, "Enter a whole number of days");
        return null;
      }
      return Number.parseInt(t, 10);
    };

    // A bad string is reported once here and then treated as blank so the
    // shared rules don't pile a second message on the same field.
    const handlingDaysMin = parseInt0(data.handlingDaysMin, "handlingDaysMin");
    const handlingDaysMax = parseInt0(data.handlingDaysMax, "handlingDaysMax");
    const transitDaysMin = parseInt0(data.transitDaysMin, "transitDaysMin");
    const transitDaysMax = parseInt0(data.transitDaysMax, "transitDaysMax");

    const accepting = data.returnsMode === "accept";
    let returnWindowDays: number | null = null;
    if (data.returnsMode === "none") returnWindowDays = 0;
    if (accepting) {
      const t = data.returnWindowDays.trim();
      if (t === "") {
        issue("returnWindowDays", "Enter how many days customers have");
      } else if (!/^\d+$/.test(t)) {
        issue("returnWindowDays", "Enter a whole number of days");
      } else {
        const n = Number.parseInt(t, 10);
        if (n < 1 || n > RETURN_WINDOW_DAYS_MAX) {
          issue(
            "returnWindowDays",
            `Enter a return window of 1–${RETURN_WINDOW_DAYS_MAX} days`,
          );
        } else {
          returnWindowDays = n;
        }
      }
    }

    let returnShippingFeeCents: number | null = null;
    const feeRaw = data.returnShippingFeeDollars.trim();
    if (accepting && data.returnFees === "flat_fee" && feeRaw !== "") {
      const n = Number.parseFloat(feeRaw);
      if (Number.isNaN(n) || n < 0) {
        issue("returnShippingFeeDollars", "Enter a valid return fee");
      } else {
        returnShippingFeeCents = Math.round(n * 100);
      }
    }

    // An invalid window was already reported above. While accepting, stand in
    // a valid one so the fee/method rules still run and every missing field is
    // flagged in one pass.
    const parsed: DeliveryReturnsParsed = {
      handlingDaysMin,
      handlingDaysMax,
      transitDaysMin,
      transitDaysMax,
      returnWindowDays: accepting ? (returnWindowDays ?? 1) : returnWindowDays,
      returnFees: accepting && data.returnFees !== "" ? data.returnFees : null,
      returnShippingFeeCents,
      returnMethod:
        accepting && data.returnMethod !== "" ? data.returnMethod : null,
    };

    const pathFor: Record<DeliveryReturnsIssueKey, string> = {
      handlingDaysMin: "handlingDaysMin",
      handlingDaysMax: "handlingDaysMax",
      transitDaysMin: "transitDaysMin",
      transitDaysMax: "transitDaysMax",
      returnWindowDays: "returnWindowDays",
      returnFees: "returnFees",
      returnShippingFee: "returnShippingFeeDollars",
      returnMethod: "returnMethod",
    };
    checkDeliveryReturns(parsed, (key, message) =>
      issue(pathFor[key], message),
    );
  });

export type DeliveryReturnsFormValues = z.infer<
  typeof deliveryReturnsFormSchema
>;

// ── Wire (tRPC input) schema ─────────────────────────────────────────────────

const nullableInt = (max: number) =>
  z.number().int().min(0).max(max).nullable();

export const deliveryReturnsInputSchema = z
  .object({
    handlingDaysMin: nullableInt(HANDLING_DAYS_MAX),
    handlingDaysMax: nullableInt(HANDLING_DAYS_MAX),
    transitDaysMin: nullableInt(TRANSIT_DAYS_MAX),
    transitDaysMax: nullableInt(TRANSIT_DAYS_MAX),
    /** null = not set, 0 = no returns, 1–365 = accept returns. */
    returnWindowDays: nullableInt(RETURN_WINDOW_DAYS_MAX),
    returnFees: z.enum(RETURN_FEES).nullable(),
    returnShippingFeeCents: z.number().int().min(0).nullable(),
    returnMethod: z.enum(RETURN_METHODS).nullable(),
  })
  .superRefine((data, ctx) => {
    const pathFor: Record<DeliveryReturnsIssueKey, string> = {
      handlingDaysMin: "handlingDaysMin",
      handlingDaysMax: "handlingDaysMax",
      transitDaysMin: "transitDaysMin",
      transitDaysMax: "transitDaysMax",
      returnWindowDays: "returnWindowDays",
      returnFees: "returnFees",
      returnShippingFee: "returnShippingFeeCents",
      returnMethod: "returnMethod",
    };
    checkDeliveryReturns(data, (key, message) =>
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: [pathFor[key]],
      }),
    );
  });

export type DeliveryReturnsInput = z.infer<typeof deliveryReturnsInputSchema>;

// ── Row ⇄ form helpers ───────────────────────────────────────────────────────

/** The Business columns the delivery/returns form reads. */
export type DeliveryReturnsRow = {
  handlingDaysMin?: number | null;
  handlingDaysMax?: number | null;
  transitDaysMin?: number | null;
  transitDaysMax?: number | null;
  returnWindowDays?: number | null;
  returnFees?: string | null;
  returnShippingFeeCents?: number | null;
  returnMethod?: string | null;
};

const intToField = (n: number | null | undefined): string =>
  n === null || n === undefined ? "" : String(n);

/** DB row → form defaults. Unknown stored enum strings fall back to blank. */
export function deliveryReturnsFormDefaults(
  row: DeliveryReturnsRow,
): DeliveryReturnsFormValues {
  const window = row.returnWindowDays ?? null;
  const returnsMode: ReturnsMode =
    window === null ? "unset" : window === 0 ? "none" : "accept";
  const fees = RETURN_FEES.find((f) => f === row.returnFees) ?? "";
  const method = RETURN_METHODS.find((m) => m === row.returnMethod) ?? "";
  const cents = row.returnShippingFeeCents ?? null;
  return {
    handlingDaysMin: intToField(row.handlingDaysMin),
    handlingDaysMax: intToField(row.handlingDaysMax),
    transitDaysMin: intToField(row.transitDaysMin),
    transitDaysMax: intToField(row.transitDaysMax),
    returnsMode,
    returnWindowDays: returnsMode === "accept" ? intToField(window) : "",
    returnFees: returnsMode === "accept" ? fees : "",
    returnShippingFeeDollars:
      returnsMode === "accept" && fees === "flat_fee" && cents !== null
        ? (cents / 100).toFixed(2)
        : "",
    returnMethod: returnsMode === "accept" ? method : "",
  };
}

const fieldToInt = (raw: string): number | null => {
  const t = raw.trim();
  return t === "" ? null : Number.parseInt(t, 10);
};

/**
 * Validated form values → wire input. Only call with values that passed
 * `deliveryReturnsFormSchema`. Irrelevant fields are nulled so the payload
 * never carries a stale fee/method under "No returns".
 */
export function deliveryReturnsFormToInput(
  values: DeliveryReturnsFormValues,
): DeliveryReturnsInput {
  const accepting = values.returnsMode === "accept";
  const fees = accepting && values.returnFees !== "" ? values.returnFees : null;
  return {
    handlingDaysMin: fieldToInt(values.handlingDaysMin),
    handlingDaysMax: fieldToInt(values.handlingDaysMax),
    transitDaysMin: fieldToInt(values.transitDaysMin),
    transitDaysMax: fieldToInt(values.transitDaysMax),
    returnWindowDays:
      values.returnsMode === "unset"
        ? null
        : values.returnsMode === "none"
          ? 0
          : fieldToInt(values.returnWindowDays),
    returnFees: fees,
    returnShippingFeeCents:
      fees === "flat_fee"
        ? Math.round(Number.parseFloat(values.returnShippingFeeDollars) * 100)
        : null,
    returnMethod:
      accepting && values.returnMethod !== "" ? values.returnMethod : null,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Local delivery (owner drives orders to customers within N miles of a ZIP)
//
// Like delivery times + returns, this is independent of the shipping mode, so it
// has its own form schema (strings for the inputs, fee/minimum in dollars) and
// its own wire schema for business.updateLocalDelivery (ints / cents / nulls).
// ──────────────────────────────────────────────────────────────────────────────

export const LOCAL_DELIVERY_RADIUS_MIN = 1;
export const LOCAL_DELIVERY_RADIUS_MAX = 100;
export const LOCAL_DELIVERY_INSTRUCTIONS_MAX = 1000;
const LOCAL_DELIVERY_FEE_MAX_CENTS = 1_000_000;

/** What the local-delivery form holds. */
export type LocalDeliveryFormValues = {
  offersLocalDelivery: boolean;
  /** "" = measure from the business address ZIP. */
  originZip: string;
  radiusMiles: string;
  feeDollars: string;
  /** Closer prices inside the radius, in the order the owner typed them. */
  bands: LocalDeliveryBandFormRow[];
  minOrderDollars: string;
  instructions: string;
};

/** One "Within N miles → $X" row of the form. */
export type LocalDeliveryBandFormRow = {
  upToMiles: string;
  feeDollars: string;
};

/** The Business columns the local-delivery form reads. */
export type LocalDeliveryRow = {
  offersLocalDelivery?: boolean | null;
  localDeliveryOriginZip?: string | null;
  localDeliveryRadiusMiles?: number | null;
  localDeliveryFeeCents?: number | null;
  /** Json column; read through `parseLocalDeliveryBands`. */
  localDeliveryBands?: unknown;
  localDeliveryMinOrderCents?: number | null;
  localDeliveryInstructions?: string | null;
};

const ZIP_FIELD = /^\d{5}(?:-?\d{4})?$/;

/** A non-negative dollar amount; blank is "not set". `undefined` = invalid. */
function parseOptionalDollars(raw: string): number | null | undefined {
  const t = raw.trim().replace(/^\$/, "");
  if (t === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return undefined;
  return Math.round(Number.parseFloat(t) * 100);
}

/**
 * Builds the form schema. `fallbackZip` is the business address ZIP the server
 * measures from when the owner leaves "Deliver from ZIP" blank — turning
 * delivery on needs one or the other.
 */
export function createLocalDeliveryFormSchema(fallbackZip: string | null) {
  return z
    .object({
      offersLocalDelivery: z.boolean(),
      originZip: z.string(),
      radiusMiles: z.string(),
      feeDollars: z.string(),
      bands: z.array(
        z.object({ upToMiles: z.string(), feeDollars: z.string() }),
      ),
      minOrderDollars: z.string(),
      instructions: z
        .string()
        .max(
          LOCAL_DELIVERY_INSTRUCTIONS_MAX,
          `Keep this under ${LOCAL_DELIVERY_INSTRUCTIONS_MAX} characters`,
        ),
    })
    .superRefine((data, ctx) => {
      const issue = (
        path: keyof LocalDeliveryFormValues | (string | number)[],
        message: string,
      ) =>
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: Array.isArray(path) ? path : [path],
        });

      const zip = data.originZip.trim();
      if (zip !== "" && !ZIP_FIELD.test(zip)) {
        issue("originZip", "Enter a 5-digit ZIP code");
      }

      if (parseOptionalDollars(data.feeDollars) === undefined) {
        issue("feeDollars", "Enter a valid delivery fee (e.g. 5.00, or 0)");
      }
      if (parseOptionalDollars(data.minOrderDollars) === undefined) {
        issue("minOrderDollars", "Enter a valid minimum order amount");
      }

      const radiusRaw = data.radiusMiles.trim();
      if (radiusRaw !== "") {
        const n = /^\d+$/.test(radiusRaw)
          ? Number.parseInt(radiusRaw, 10)
          : NaN;
        if (
          Number.isNaN(n) ||
          n < LOCAL_DELIVERY_RADIUS_MIN ||
          n > LOCAL_DELIVERY_RADIUS_MAX
        ) {
          issue(
            "radiusMiles",
            `Enter a whole number from ${LOCAL_DELIVERY_RADIUS_MIN} to ${LOCAL_DELIVERY_RADIUS_MAX} miles`,
          );
        }
      }

      // Closer prices: whole miles, strictly inside the radius, each used once.
      const radiusN = /^\d+$/.test(radiusRaw)
        ? Number.parseInt(radiusRaw, 10)
        : NaN;
      const radiusKnown =
        !Number.isNaN(radiusN) &&
        radiusN >= LOCAL_DELIVERY_RADIUS_MIN &&
        radiusN <= LOCAL_DELIVERY_RADIUS_MAX;
      if (data.bands.length > MAX_LOCAL_DELIVERY_BANDS) {
        issue(
          "bands",
          `You can add up to ${MAX_LOCAL_DELIVERY_BANDS} closer prices.`,
        );
      }
      const seenMiles = new Set<number>();
      data.bands.forEach((band, i) => {
        const milesRaw = band.upToMiles.trim();
        const miles = /^\d+$/.test(milesRaw)
          ? Number.parseInt(milesRaw, 10)
          : NaN;
        if (
          Number.isNaN(miles) ||
          miles < LOCAL_DELIVERY_RADIUS_MIN ||
          miles > LOCAL_DELIVERY_RADIUS_MAX
        ) {
          issue(
            ["bands", i, "upToMiles"],
            `Enter a whole number from ${LOCAL_DELIVERY_RADIUS_MIN} to ${LOCAL_DELIVERY_RADIUS_MAX} miles`,
          );
        } else if (!radiusKnown) {
          issue(["bands", i, "upToMiles"], "Enter your delivery radius first.");
        } else if (miles >= radiusN) {
          issue(
            ["bands", i, "upToMiles"],
            `Must be less than your ${radiusN}-mile radius.`,
          );
        } else if (seenMiles.has(miles)) {
          issue(
            ["bands", i, "upToMiles"],
            "Each distance can only be used once.",
          );
        } else {
          seenMiles.add(miles);
        }

        const fee = parseOptionalDollars(band.feeDollars);
        if (fee === undefined || fee === null) {
          issue(
            ["bands", i, "feeDollars"],
            "Enter a price (e.g. 3.00, or 0 for free)",
          );
        } else if (fee > LOCAL_DELIVERY_FEE_MAX_CENTS) {
          issue(["bands", i, "feeDollars"], "That price is too high");
        }
      });

      if (data.offersLocalDelivery) {
        if (radiusRaw === "") {
          issue(
            "radiusMiles",
            "Enter how far you deliver, from 1 to 100 miles",
          );
        }
        if (zip === "" && !(fallbackZip ?? "").trim()) {
          issue(
            "originZip",
            "Enter the ZIP code you deliver from (your business address has no ZIP yet)",
          );
        }
      }
    });
}

/** Wire format for business.updateLocalDelivery. */
export const localDeliveryInputSchema = z
  .object({
    offersLocalDelivery: z.boolean(),
    /** Blank/null = measure from the business address ZIP. */
    originZip: z.string().trim().max(10).nullable(),
    radiusMiles: z
      .number()
      .int()
      .min(LOCAL_DELIVERY_RADIUS_MIN)
      .max(LOCAL_DELIVERY_RADIUS_MAX)
      .nullable(),
    /** 0 = free delivery. */
    feeCents: z.number().int().min(0).max(LOCAL_DELIVERY_FEE_MAX_CENTS),
    /**
     * Closer prices inside the radius (see `~/lib/local-delivery-bands`).
     * Each distance is strictly less than the radius and used once; stored
     * nearest first.
     */
    bands: z
      .array(
        localDeliveryBandSchema.extend({
          feeCents: z.number().int().min(0).max(LOCAL_DELIVERY_FEE_MAX_CENTS),
        }),
      )
      .max(
        MAX_LOCAL_DELIVERY_BANDS,
        `You can add up to ${MAX_LOCAL_DELIVERY_BANDS} closer prices.`,
      )
      .default([]),
    minOrderCents: z.number().int().min(0).max(100_000_000).nullable(),
    instructions: z
      .string()
      .trim()
      .max(LOCAL_DELIVERY_INSTRUCTIONS_MAX)
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.offersLocalDelivery && data.radiusMiles === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter how far you deliver, from 1 to 100 miles",
        path: ["radiusMiles"],
      });
    }
    const seen = new Set<number>();
    data.bands.forEach((band, i) => {
      if (data.radiusMiles === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter your delivery radius first.",
          path: ["bands", i, "upToMiles"],
        });
      } else if (band.upToMiles >= data.radiusMiles) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Must be less than your ${data.radiusMiles}-mile radius.`,
          path: ["bands", i, "upToMiles"],
        });
      } else if (seen.has(band.upToMiles)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each distance can only be used once.",
          path: ["bands", i, "upToMiles"],
        });
      }
      seen.add(band.upToMiles);
    });
  })
  .transform((data) => ({
    ...data,
    bands: [...data.bands].sort((a, b) => a.upToMiles - b.upToMiles),
  }));

export type LocalDeliveryInput = z.infer<typeof localDeliveryInputSchema>;

/** DB row → form defaults. */
export function localDeliveryFormDefaults(
  row: LocalDeliveryRow,
): LocalDeliveryFormValues {
  const cents = (c: number | null | undefined) =>
    c === null || c === undefined ? "" : (c / 100).toFixed(2);
  return {
    offersLocalDelivery: row.offersLocalDelivery ?? false,
    originZip: row.localDeliveryOriginZip ?? "",
    radiusMiles:
      row.localDeliveryRadiusMiles === null ||
      row.localDeliveryRadiusMiles === undefined
        ? ""
        : String(row.localDeliveryRadiusMiles),
    // A configured fee of 0 shows as "0.00" so "free" is a visible choice;
    // nothing configured yet starts blank (read as free on save).
    feeDollars:
      row.localDeliveryFeeCents && row.localDeliveryFeeCents > 0
        ? cents(row.localDeliveryFeeCents)
        : row.offersLocalDelivery
          ? "0.00"
          : "",
    bands: parseLocalDeliveryBands(
      row.localDeliveryBands,
      row.localDeliveryRadiusMiles ?? null,
    ).map((b) => ({
      upToMiles: String(b.upToMiles),
      feeDollars: cents(b.feeCents),
    })),
    minOrderDollars: cents(row.localDeliveryMinOrderCents),
    instructions: row.localDeliveryInstructions ?? "",
  };
}

/**
 * Validated form values → wire input. Only call with values that passed
 * `createLocalDeliveryFormSchema`.
 */
export function localDeliveryFormToInput(
  values: LocalDeliveryFormValues,
): LocalDeliveryInput {
  const radius = values.radiusMiles.trim();
  const zip = values.originZip.trim();
  const instructions = values.instructions.trim();
  return {
    offersLocalDelivery: values.offersLocalDelivery,
    originZip: zip === "" ? null : zip,
    radiusMiles: radius === "" ? null : Number.parseInt(radius, 10),
    feeCents: parseOptionalDollars(values.feeDollars) ?? 0,
    bands: values.bands
      .map((b) => ({
        upToMiles: Number.parseInt(b.upToMiles.trim(), 10),
        feeCents: parseOptionalDollars(b.feeDollars) ?? 0,
      }))
      .sort((a, b) => a.upToMiles - b.upToMiles),
    minOrderCents: parseOptionalDollars(values.minOrderDollars) ?? null,
    instructions: instructions === "" ? null : instructions,
  };
}
