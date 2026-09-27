import type { SocialNetworkKey } from "~/lib/social-links";
import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { resolveSocialLinks } from "~/lib/social-links";
import { getRawCustomFieldString } from "~/lib/template-fields";

import { nonBlank } from "./umsc-non-blank";

/** The slice of `business.simplifiedGet*` this helper reads. */
export type UmscContactSource =
  | {
      phoneNumber?: string | null;
      businessHours?: unknown;
      siteContent?: {
        footerText?: string | null;
        socialLinks?: unknown;
        customFields?: unknown;
      } | null;
    }
  | null
  | undefined;

/**
 * A resolved social link as plain data (no icon component), so it can cross
 * the server → client boundary (`UmscContactPage` → `UmscContactForm` →
 * `UmscContactAside`). `UmscSocialIcons` looks the icon up by `key`.
 */
export type UmscSocialLink = {
  key: SocialNetworkKey;
  url: string;
  ariaLabel: string;
};

export type UmscContactDetails = {
  phone?: string;
  /** Settings → Business Hours, formatted as label/value rows. */
  hoursRows: { label: string; value: string }[];
  /** Legacy saved hours text — only set when `hoursRows` is empty. */
  legacyHours?: string;
  footerTagline?: string;
  /** Every network Content → Branding resolves, plus legacy fallbacks. */
  socials: UmscSocialLink[];
};

/**
 * The three networks umsc used to collect as its own `umsc.global.*-url`
 * fields (retired 2026-09-26).
 */
const LEGACY_SOCIAL_KEYS = {
  instagram: "umsc.global.instagram-url",
  facebook: "umsc.global.facebook-url",
  tiktok: "umsc.global.tiktok-url",
} as const satisfies Partial<Record<SocialNetworkKey, string>>;

/**
 * Contact/footer data for `umsc`'s footer, header (mobile menu), contact
 * page, and FAQ hero. Settings (phone, hours) and Content → Branding (footer
 * tagline, social links) always win; the old `umsc.global.*` /
 * `umsc.contact.hours` fields (retired 2026-09-26) are read only as a silent
 * fallback for a site that saved a value before the move — never written or
 * cleared from here. Anything blank everywhere is `undefined` (or an empty
 * array), and the caller hides it.
 *
 * Socials merge per network: a network Branding has no (safe) URL for falls
 * back to the legacy saved URL for that network (Instagram / Facebook /
 * TikTok only). Everything goes through `resolveSocialLinks`, so legacy
 * values get the same `safeHref` scheme allowlist and canonical order.
 */
export function resolveUmscContactDetails(
  business: UmscContactSource,
): UmscContactDetails {
  const siteContent = business?.siteContent;
  const customFields = siteContent?.customFields;
  const legacy = (key: string) =>
    nonBlank(getRawCustomFieldString(customFields, key));

  const hoursRows = formatBusinessHours(
    parseBusinessHours(business?.businessHours),
  );

  const merged: Partial<Record<SocialNetworkKey, string>> = {};
  for (const [network, key] of Object.entries(LEGACY_SOCIAL_KEYS)) {
    const url = legacy(key);
    if (url) merged[network as SocialNetworkKey] = url;
  }
  for (const link of resolveSocialLinks(siteContent?.socialLinks)) {
    merged[link.key] = link.url;
  }
  const socials = resolveSocialLinks(merged).map(({ key, url, ariaLabel }) => ({
    key,
    url,
    ariaLabel,
  }));

  return {
    phone:
      nonBlank(business?.phoneNumber) ??
      legacy("umsc.global.customer-service-phone"),
    hoursRows,
    legacyHours:
      hoursRows.length > 0 ? undefined : legacy("umsc.contact.hours"),
    footerTagline:
      nonBlank(siteContent?.footerText) ?? legacy("umsc.global.footer-tagline"),
    socials,
  };
}

/** `tel:` href for a display phone number (digits and a leading `+` only). */
export function umscTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
