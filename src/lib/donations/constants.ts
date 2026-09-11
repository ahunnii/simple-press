/**
 * Shared constants for the Donations/Tips feature. Kept in one place so the
 * checkout body validator (`src/lib/validators/donation.ts`), the owner
 * settings validator, and any UI that renders preset amount pickers all
 * agree on the same bounds.
 */

/** Smallest amount a donor can give: $1.00. */
export const MIN_DONATION_CENTS = 100;

/** Largest amount a donor can give: $10,000.00. Above this, talk to us. */
export const MAX_DONATION_CENTS = 1_000_000;

/** Preset amounts shown when the owner hasn't configured their own: $5 / $10 / $25. */
export const DEFAULT_DONATION_PRESETS_CENTS = [500, 1000, 2500];

/** Most preset amount buttons an owner can configure. */
export const MAX_DONATION_PRESETS = 4;

/** Longest donor name we'll accept on the checkout form. */
export const MAX_DONOR_NAME_LENGTH = 100;

/**
 * Longest donor message we'll accept. Capped at 500 because the message is
 * stored in Stripe Checkout session metadata, and Stripe caps each metadata
 * value at 500 characters.
 */
export const MAX_DONATION_MESSAGE_LENGTH = 500;
