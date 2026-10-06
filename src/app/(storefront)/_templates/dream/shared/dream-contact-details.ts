import { formatBusinessHours, parseBusinessHours } from "~/lib/business-hours";
import { getRawCustomFieldString } from "~/lib/template-fields";

import { nonBlank } from "./dream-non-blank";

/** The slice of `business.simplifiedGet*` this helper reads. */
export type DreamContactSource =
  | {
      supportEmail?: string | null;
      phoneNumber?: string | null;
      businessAddress?: string | null;
      businessHours?: unknown;
      siteContent?: {
        footerText?: string | null;
        customFields?: unknown;
      } | null;
    }
  | null
  | undefined;

export type DreamContactDetails = {
  email?: string;
  phone?: string;
  address?: string;
  /** Settings → Business Hours, formatted as label/value rows. */
  hoursRows: { label: string; value: string }[];
  /** Legacy saved single-line hours — only set when `hoursRows` is empty. */
  legacyHours?: string;
  footerTagline?: string;
};

/**
 * Contact/footer data for `dream`'s footer, contact page, and maintenance
 * page. Settings (email, phone, address, hours) and Content → Branding (footer
 * tagline) always win; the old `dream.global.contact-*` /
 * `dream.global.footer-tagline` fields (retired 2026-09-26) are read only as
 * a silent fallback for a site that saved a value before the move — never
 * written or cleared from here. Anything blank everywhere is `undefined`
 * (or an empty `hoursRows`), and the caller hides it.
 */
export function resolveDreamContactDetails(
  business: DreamContactSource,
): DreamContactDetails {
  const customFields = business?.siteContent?.customFields;
  const legacy = (key: string) =>
    nonBlank(getRawCustomFieldString(customFields, key));

  const hoursRows = formatBusinessHours(
    parseBusinessHours(business?.businessHours),
  );

  return {
    email:
      nonBlank(business?.supportEmail) ?? legacy("dream.global.contact-email"),
    phone:
      nonBlank(business?.phoneNumber) ?? legacy("dream.global.contact-phone"),
    address: nonBlank(business?.businessAddress),
    hoursRows,
    legacyHours:
      hoursRows.length > 0 ? undefined : legacy("dream.global.contact-hours"),
    footerTagline:
      nonBlank(business?.siteContent?.footerText) ??
      legacy("dream.global.footer-tagline"),
  };
}

/** `tel:` href for a display phone number (digits and a leading `+` only). */
export function dreamTelHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
