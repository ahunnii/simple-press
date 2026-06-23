import { z } from "zod";

export const shippingFormSchema = z
  .object({
    shippingType: z.enum(["free", "flat_rate", "flat_rate_with_threshold", "zone_weight"]),
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
          message: "Add pickup hours/instructions so customers know when to collect their order",
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
  states: z.array(z.string().length(2)).min(1, "Each zone must have at least one state"),
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
        if (prev !== undefined && prev.maxLb !== null && tier.minLb !== prev.maxLb) {
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
        message: "Enter a valid fallback rate (e.g. \"19.99\")",
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
          message: "Add pickup hours/instructions so customers know when to collect their order",
          path: ["pickupInstructions"],
        });
      }
    }
  });

export type ZoneWeightFormValues = z.infer<typeof zoneWeightFormSchema>;
