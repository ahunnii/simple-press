/**
 * The owner picks one wording for the whole feature — "Donate", "Tip", or
 * "Support" — via `Business.donationLabel`, and every user-facing string
 * (page title, button copy, nav label) derives from that single choice
 * instead of being configured separately. Keeps the donate page, header/
 * footer links, and Stripe Checkout button copy from drifting out of sync.
 *
 * Pure/client-safe: no server imports, so this can be used from both server
 * code (page metadata, Stripe session `submit_type`/copy) and client
 * components (nav links, owner settings preview) alike.
 */

export type DonationLabelKey = "donate" | "tip" | "support";

export const DONATION_LABEL_KEYS: DonationLabelKey[] = [
  "donate",
  "tip",
  "support",
];

export interface DonationLabel {
  key: DonationLabelKey;
  /** Verb form, e.g. for a call-to-action sentence: "{Verb} today". */
  verb: string;
  /** Noun form, e.g. for admin copy: "{Noun} history". */
  noun: string;
  /** `<title>` / page heading. */
  pageTitle: string;
  /** Button/link copy. */
  buttonText: string;
}

const DONATION_LABELS: Record<DonationLabelKey, DonationLabel> = {
  donate: {
    key: "donate",
    verb: "Donate",
    noun: "Donation",
    pageTitle: "Donate",
    buttonText: "Donate",
  },
  tip: {
    key: "tip",
    verb: "Tip",
    noun: "Tip",
    pageTitle: "Leave a Tip",
    buttonText: "Leave a Tip",
  },
  support: {
    key: "support",
    verb: "Support",
    noun: "Contribution",
    pageTitle: "Support Us",
    buttonText: "Support Us",
  },
};

function isDonationLabelKey(value: string): value is DonationLabelKey {
  return (DONATION_LABEL_KEYS as string[]).includes(value);
}

/**
 * Resolves `Business.donationLabel` to its full copy set. Unknown or absent
 * input (stale data, a key removed from a future release) falls back to
 * `"donate"` rather than throwing, so a bad value never breaks the page.
 */
export function resolveDonationLabel(
  raw: string | null | undefined,
): DonationLabel {
  if (raw && isDonationLabelKey(raw)) {
    return DONATION_LABELS[raw];
  }
  return DONATION_LABELS.donate;
}
