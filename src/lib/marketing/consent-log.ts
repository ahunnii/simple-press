import type { TxClient } from "~/server/db";
import { getClientIpFromHeaders } from "~/lib/rate-limit";

import { MARKETING_CONSENT_SOURCES } from "./consent";

/**
 * Append-only evidence log of email-marketing consent changes
 * (`MarketingConsentEvent`). `Customer.acceptsMarketing` and the marketing*
 * columns remain the live state; every write that flips them should also record
 * one event here, in the same transaction, so the store can show WHEN, HOW and
 * (for opt-ins) UNDER WHAT WORDING a customer agreed or withdrew.
 *
 * `ip` and `userAgent` are `/// @encrypted` (prisma-field-encryption): they
 * are encrypted on write and decrypted on read by the extended client —
 * including inside `db.$transaction(async (tx) => ...)` — but can never appear
 * in a `where`, and raw SQL sees only ciphertext.
 *
 * Customer erasure must delete the customer's rows (the FK is SetNull only as a
 * backstop for a hard delete).
 */

export const MARKETING_CONSENT_EVENT_TYPES = [
  "OPT_IN",
  "OPT_OUT",
  "SUPPRESSED",
  "UNSUPPRESSED",
] as const;

export type MarketingConsentEventType =
  (typeof MARKETING_CONSENT_EVENT_TYPES)[number];

/**
 * Every opt-in source (`MARKETING_CONSENT_SOURCES`) plus the opt-out /
 * suppression channels. Stored as a plain string (the repo's habit for
 * status-like columns); this list is the single place the values live.
 */
export const MARKETING_CONSENT_EVENT_SOURCES = [
  ...MARKETING_CONSENT_SOURCES,
  /** Footer unsubscribe link (GET/POST page). */
  "UNSUBSCRIBE_LINK",
  /** RFC 8058 List-Unsubscribe-Post one-click from the mail client. */
  "ONE_CLICK",
  /** Store owner / staff changed it in admin. */
  "OWNER",
  /** Provider webhook: spam complaint. */
  "COMPLAINT",
  /** Provider webhook: hard bounce. */
  "HARD_BOUNCE",
  /** Provider webhook: address on the provider's suppression list. */
  "PROVIDER_SUPPRESSED",
  /** Contact import: marked unsubscribed on the previous site (OPT_OUT). */
  "IMPORT",
] as const;

export type MarketingConsentEventSource =
  (typeof MARKETING_CONSENT_EVENT_SOURCES)[number];

export const MARKETING_CONSENT_EVENT_SOURCE_LABELS: Record<
  MarketingConsentEventSource,
  string
> = {
  CHECKOUT: "Checkout",
  NEWSLETTER_FORM: "Newsletter sign-up form",
  ACCOUNT: "Account preferences",
  RESUBSCRIBE_LINK: "Resubscribed from email link",
  LEGACY_ACCOUNT: "Account (before consent tracking)",
  IMPORT_CONFIRM: "Confirmed from an invite after moving stores",
  UNSUBSCRIBE_LINK: "Unsubscribe link",
  ONE_CLICK: "One-click unsubscribe (mail app)",
  OWNER: "Changed by the store",
  COMPLAINT: "Marked as spam",
  HARD_BOUNCE: "Email bounced",
  PROVIDER_SUPPRESSED: "Blocked by the email provider",
  IMPORT: "Unsubscribed on the previous site (imported)",
};

/** Max stored lengths (applied before encryption). */
export const CONSENT_IP_MAX_LENGTH = 64;
export const CONSENT_USER_AGENT_MAX_LENGTH = 512;

/** Trim, drop empties, and cap length. Exported for tests. */
export function clampConsentMeta(
  value: string | null | undefined,
  max: number,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/**
 * Client IP + user agent of the current request, for consent evidence. The IP
 * comes from the same trusted-proxy-aware resolver the rate limiters use
 * (`getClientIpFromHeaders`); its `"unknown"` fallback becomes `undefined`.
 */
export function consentRequestMeta(headers: Headers): {
  ip?: string;
  userAgent?: string;
} {
  const rawIp = getClientIpFromHeaders(headers);
  const ip = clampConsentMeta(
    rawIp === "unknown" ? undefined : rawIp,
    CONSENT_IP_MAX_LENGTH,
  );
  const userAgent = clampConsentMeta(
    headers.get("user-agent"),
    CONSENT_USER_AGENT_MAX_LENGTH,
  );
  return {
    ...(ip ? { ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

export type RecordConsentEventInput = {
  businessId: string;
  customerId: string | null;
  type: MarketingConsentEventType;
  source: MarketingConsentEventSource;
  ip?: string | null;
  userAgent?: string | null;
  /** The exact consent text shown at opt-in (see consent-wording.ts). */
  wording?: string | null;
  campaignId?: string | null;
};

/**
 * Append one consent event. Pass the transaction client that also writes the
 * Customer's marketing columns so the evidence and the state change commit
 * together. `ip` / `userAgent` are clamped here, so callers may pass raw
 * header values.
 */
export async function recordConsentEvent(
  tx: TxClient,
  input: RecordConsentEventInput,
): Promise<{ id: string }> {
  return tx.marketingConsentEvent.create({
    data: {
      businessId: input.businessId,
      customerId: input.customerId,
      type: input.type,
      source: input.source,
      ip: clampConsentMeta(input.ip, CONSENT_IP_MAX_LENGTH) ?? null,
      userAgent:
        clampConsentMeta(input.userAgent, CONSENT_USER_AGENT_MAX_LENGTH) ??
        null,
      wording: input.wording ?? null,
      campaignId: input.campaignId ?? null,
    },
    select: { id: true },
  });
}
