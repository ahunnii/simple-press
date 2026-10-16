/**
 * Consent wording shown to people on sign-up forms.
 *
 * These strings are rendered to visitors AND recorded in the consent log as
 * proof of what they agreed to, so change them here only. Components import
 * from this file instead of hardcoding their own copy.
 */

/** Newsletter sign-up note, shown under every newsletter form. */
export const NEWSLETTER_CONSENT_WORDING =
  "We'll email you a link to confirm. Unsubscribe anytime.";

/** Checkout "email me news and offers" checkbox label. */
export function checkoutMarketingOptInWording(businessName: string): string {
  return `Email me news and offers from ${businessName}`;
}

/**
 * Label of the "Resubscribe" button on the email-preferences page (the undo
 * offered after an unsubscribe). Pressing it is the opt-in, so this is the
 * wording recorded with the OPT_IN / RESUBSCRIBE_LINK consent event.
 */
export const RESUBSCRIBE_WORDING = "Resubscribe";

/**
 * Account > Preferences marketing-emails switch: the sentence shown beside it
 * ("Marketing Emails" heading + this). Recorded when the customer flips it on.
 */
export function accountMarketingOptInWording(businessName: string): string {
  return `Receive news, promotions, and updates from ${businessName}.`;
}
