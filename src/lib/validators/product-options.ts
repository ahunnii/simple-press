import { z } from "zod";

import {
  CUSTOMIZER_MAX_GROUPS,
  CUSTOMIZER_MAX_ID_LENGTH,
  CUSTOMIZER_MAX_RAW_TEXT_LENGTH,
  CUSTOMIZER_MAX_VALUES_PER_GROUP,
  CUSTOMIZER_TEXT_MAX_LENGTH,
} from "~/lib/customizer/types";

/**
 * Schemas for product options (the customizer).
 *
 * Two audiences:
 *
 * - `customizerSelectionSchema` bounds the SHOPPER's wire payload (cart,
 *   status check, checkout). It only limits size; whether ids exist, counts
 *   fit and stock suffices is `priceConfiguration`'s job against the stored
 *   definition (`~/lib/customizer/evaluate`).
 * - `optionGroupInputSchema` / `optionValueInputSchema` validate the
 *   OWNER's admin saves. The `*BaseSchema` objects are exported unrefined so
 *   a router can `.extend()` them (e.g. with an `id`) and re-apply the
 *   matching `refine*` helper.
 *
 * All prices are integer cents.
 */

export const OPTION_PRICE_MAX_CENTS = 1_000_000;
const OPTION_COUNT_MAX = CUSTOMIZER_MAX_VALUES_PER_GROUP;

const idSchema = z.string().min(1).max(CUSTOMIZER_MAX_ID_LENGTH);

export const customizerSelectionSchema = z.object({
  choices: z
    .array(
      z.object({
        groupId: idSchema,
        valueIds: z.array(idSchema).max(CUSTOMIZER_MAX_VALUES_PER_GROUP),
      }),
    )
    .max(CUSTOMIZER_MAX_GROUPS)
    .default([]),
  texts: z
    .array(
      z.object({
        groupId: idSchema,
        // Raw, before cleaning; the per-group limit is applied after.
        text: z.string().max(CUSTOMIZER_MAX_RAW_TEXT_LENGTH),
      }),
    )
    .max(CUSTOMIZER_MAX_GROUPS)
    .default([]),
});

export type CustomizerSelectionInput = z.input<
  typeof customizerSelectionSchema
>;

const priceCents = z
  .number()
  .int("Enter a whole number of cents")
  .min(0, "Price can't be negative")
  .max(OPTION_PRICE_MAX_CENTS, "Price is too high");

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

export const optionGroupInputBaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the option a name")
    .max(80, "Name must be 80 characters or fewer"),
  /** Owner-only name to tell two same-named groups apart in the admin. */
  adminLabel: optionalText(80, "Admin label must be 80 characters or fewer"),
  helpText: optionalText(300, "Help text must be 300 characters or fewer"),
  kind: z.enum(["choice", "text"]),
  required: z.boolean().default(false),
  minSelections: z.number().int().min(0).max(OPTION_COUNT_MAX).default(0),
  maxSelections: z.number().int().min(1).max(OPTION_COUNT_MAX).default(1),
  includedCount: z.number().int().min(0).max(OPTION_COUNT_MAX).default(0),
  display: z.enum(["tiles", "swatches", "list"]).default("tiles"),
  maxLength: z
    .number()
    .int()
    .min(1, "Allow at least 1 character")
    .max(
      CUSTOMIZER_TEXT_MAX_LENGTH,
      `Text can be at most ${CUSTOMIZER_TEXT_MAX_LENGTH} characters`,
    )
    .nullable()
    .optional(),
  placeholder: optionalText(120, "Placeholder must be 120 characters or fewer"),
  textPriceCents: priceCents.default(0),
});

export function refineOptionGroup(
  group: {
    minSelections: number;
    maxSelections: number;
    includedCount: number;
  },
  ctx: z.RefinementCtx,
) {
  if (group.minSelections > group.maxSelections) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Minimum picks can't be more than the maximum",
      path: ["minSelections"],
    });
  }
  if (group.includedCount > group.maxSelections) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Included picks can't be more than the maximum",
      path: ["includedCount"],
    });
  }
}

export const optionGroupInputSchema =
  optionGroupInputBaseSchema.superRefine(refineOptionGroup);

export type OptionGroupInput = z.infer<typeof optionGroupInputSchema>;

export const optionValueInputBaseSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Give the choice a name")
    .max(80, "Name must be 80 characters or fewer"),
  imageUrl: z
    .string()
    .url("Enter a valid image URL")
    .max(2048, "Image URL is too long")
    .nullable()
    .optional(),
  /** `#rrggbb`, stored lower-case — same rule as form picture choices. */
  swatchColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-f]{6}$/i, "Enter a color like #ff8800")
    .transform((value) => value.toLowerCase())
    .nullable()
    .optional(),
  priceDelta: priceCents.default(0),
  priceOverride: priceCents.nullable().optional(),
  linkedProductId: z.string().min(1).nullable().optional(),
  linkedVariantId: z.string().min(1).nullable().optional(),
  available: z.boolean().default(true),
});

export function refineOptionValue(
  value: {
    priceOverride?: number | null;
    linkedProductId?: string | null;
    linkedVariantId?: string | null;
  },
  ctx: z.RefinementCtx,
) {
  if (value.linkedVariantId && !value.linkedProductId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pick the product this variant belongs to",
      path: ["linkedVariantId"],
    });
  }
  if (value.priceOverride != null && !value.linkedProductId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Only a linked choice can override its product's price",
      path: ["priceOverride"],
    });
  }
}

export const optionValueInputSchema =
  optionValueInputBaseSchema.superRefine(refineOptionValue);

export type OptionValueInput = z.infer<typeof optionValueInputSchema>;
