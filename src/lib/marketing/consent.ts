/**
 * Where a customer's email-marketing opt-in came from. Stored as a plain
 * string on `Customer.marketingConsentSource` (the repo's habit for status-like
 * columns), so this union is the single place the allowed values live.
 */
export const MARKETING_CONSENT_SOURCES = [
  "CHECKOUT",
  "NEWSLETTER_FORM",
  "ACCOUNT",
  "RESUBSCRIBE_LINK",
  "LEGACY_ACCOUNT",
  /** Clicked the one-time re-permission invite sent to a contact import. */
  "IMPORT_CONFIRM",
] as const;

export type MarketingConsentSource = (typeof MARKETING_CONSENT_SOURCES)[number];

/** Why a customer is excluded from every marketing send regardless of opt-in. */
export const MARKETING_SUPPRESSION_REASONS = [
  "HARD_BOUNCE",
  "COMPLAINT",
  "PROVIDER_SUPPRESSED",
] as const;

export type MarketingSuppressionReason =
  (typeof MARKETING_SUPPRESSION_REASONS)[number];

export const MARKETING_CONSENT_SOURCE_LABELS: Record<
  MarketingConsentSource,
  string
> = {
  CHECKOUT: "Checkout",
  NEWSLETTER_FORM: "Newsletter sign-up form",
  ACCOUNT: "Account preferences",
  RESUBSCRIBE_LINK: "Resubscribed from email link",
  LEGACY_ACCOUNT: "Account (before consent tracking)",
  IMPORT_CONFIRM: "Confirmed from an invite after moving stores",
};

/** Human label for a stored source value; tolerates unknown / null values. */
export function marketingConsentSourceLabel(
  source: string | null | undefined,
): string {
  if (!source) return "";
  return (
    (MARKETING_CONSENT_SOURCE_LABELS as Record<string, string>)[source] ??
    source
  );
}

/**
 * The Customer fields to write when someone (re)opts in. Always clears the
 * unsubscribe stamp. Clears a suppression (bounce / complaint / provider
 * block) only with `clearSuppression: true`, which callers may pass ONLY for
 * fresh proof that the address owner wants mail now: a double-opt-in confirm
 * (proves current inbox access) or the signed-in account owner's own toggle.
 * Never for a resubscribe link (unsubscribe tokens are permanent bearer tokens
 * that get forwarded) or checkout (no inbox proof at all).
 */
export function marketingOptInData(
  source: MarketingConsentSource,
  opts: { clearSuppression: boolean; now?: Date },
) {
  return {
    acceptsMarketing: true,
    marketingConsentAt: opts.now ?? new Date(),
    marketingConsentSource: source,
    marketingUnsubscribedAt: null,
    ...(opts.clearSuppression
      ? { marketingSuppressedAt: null, marketingSuppressionReason: null }
      : {}),
  };
}

/**
 * True when the customer's last word on marketing email is an unsubscribe: an
 * unsubscribe is on record and no consent was given after it (a later
 * re-subscribe lifts it). The single home of this rule — used by the
 * abandoned-checkout reminder gate and the unsubscribe page / POST.
 */
export function isMarketingUnsubscribeCurrent(customer: {
  marketingUnsubscribedAt: Date | null;
  marketingConsentAt: Date | null;
}): boolean {
  return (
    !!customer.marketingUnsubscribedAt &&
    (!customer.marketingConsentAt ||
      customer.marketingConsentAt < customer.marketingUnsubscribedAt)
  );
}

/**
 * Whether this customer ever opted in to marketing email. A resubscribe link
 * may only restore a consent that existed: offering it to someone who never
 * subscribed (e.g. an abandoned-checkout reminder recipient) would opt them
 * in from an email they never asked for. Legacy subscribers (consent from
 * before tracking) have `marketingConsentSource` but no `marketingConsentAt`;
 * erasure clears both.
 */
export function hasMarketingConsentHistory(customer: {
  acceptsMarketing: boolean;
  marketingConsentAt: Date | null;
  marketingConsentSource: string | null;
}): boolean {
  return (
    customer.acceptsMarketing ||
    customer.marketingConsentAt !== null ||
    customer.marketingConsentSource !== null
  );
}
