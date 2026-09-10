import { z } from "zod";

import {
  normalizeCashAppHandle,
  normalizeVenmoHandle,
} from "~/lib/donation-handles";
import {
  MAX_DONATION_MESSAGE_LENGTH,
  MAX_DONATION_PRESETS,
  MAX_DONOR_NAME_LENGTH,
  MIN_DONATION_CENTS,
  MAX_DONATION_CENTS,
} from "~/lib/donations/constants";
import type { DonationLabelKey } from "~/lib/donations/label";
import { DONATION_LABEL_KEYS } from "~/lib/donations/label";

/** Zod schema for a donation label key — derives the enum from the label catalog, so there is one source of truth. */
export const donationLabelKeySchema = z.enum(
  DONATION_LABEL_KEYS as [DonationLabelKey, ...DonationLabelKey[]],
);

/**
 * Body of the donation checkout session route. Only the amount and optional
 * donor-supplied name/message come from the client — Stripe Checkout itself
 * collects the donor's email, so there is deliberately no `email` field here
 * (unlike `subscriptionCheckoutBodySchema`, which has no pre-payment page to
 * lean on).
 */
export const donationCheckoutBodySchema = z.object({
  amountCents: z
    .number()
    .int()
    .min(MIN_DONATION_CENTS)
    .max(MAX_DONATION_CENTS),
  donorName: z
    .string()
    .trim()
    .max(MAX_DONOR_NAME_LENGTH)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  message: z
    .string()
    .trim()
    .max(MAX_DONATION_MESSAGE_LENGTH)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type DonationCheckoutBody = z.infer<typeof donationCheckoutBodySchema>;

// Mirrors `normalizeVenmoHandle`/`normalizeCashAppHandle` in
// `src/lib/donation-handles.ts` — normalize first (trim, strip the leading
// "@"/"$"), then validate the shape of what's left. `null` (handle cleared,
// or never set) always passes; only a non-null value is checked against the
// platform's username rules.
const venmoHandleSchema = z
  .string()
  .nullish()
  .transform((value) => normalizeVenmoHandle(value))
  .refine((value) => value === null || /^[A-Za-z0-9_-]{1,30}$/.test(value), {
    message: "Enter a valid Venmo username",
  });

// Cash App cashtags: 1-20 chars, must start with a letter (Cash App's own rule).
const cashAppHandleSchema = z
  .string()
  .nullish()
  .transform((value) => normalizeCashAppHandle(value))
  .refine(
    (value) => value === null || /^[A-Za-z][A-Za-z0-9_]{0,19}$/.test(value),
    { message: "Enter a valid Cash App cashtag" },
  );

/**
 * Owner-editable donation settings (`Business.donationLabel`/
 * `donationPresetAmounts`/`venmoHandle`/`cashAppHandle`/
 * `donationShowInHeader`/`donationShowInFooter`).
 */
export const donationSettingsSchema = z.object({
  donationLabel: donationLabelKeySchema,
  presetAmounts: z
    .array(
      z.number().int().min(MIN_DONATION_CENTS).max(MAX_DONATION_CENTS),
    )
    .max(MAX_DONATION_PRESETS),
  venmoHandle: venmoHandleSchema,
  cashAppHandle: cashAppHandleSchema,
  donationShowInHeader: z.boolean(),
  donationShowInFooter: z.boolean(),
});

export type DonationSettings = z.infer<typeof donationSettingsSchema>;
