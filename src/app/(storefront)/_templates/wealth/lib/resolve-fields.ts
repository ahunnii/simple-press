/**
 * Reads `wealth.*` custom fields out of `business.siteContent.customFields`
 * with defaults, mirroring the shape of the other templates' `resolveFields`
 * helpers (see e.g. `vii/index.ts`) but self-contained: Phase 4 owns the
 * actual `TemplateField` declarations for `wealth` (defaults + labels +
 * groups), so chrome can't build a `Map<string, TemplateField>` yet. This
 * hardcodes the same default values Phase 4 is expected to declare — when
 * those fields land, the declared `defaultValue`s MUST match the values
 * below or an owner's unset field would silently change appearance.
 *
 * Trim-then-default (not `??`): an owner who saves an empty string in the
 * visual editor means "use the default", same convention as
 * `resolveTemplateFields`.
 */

export const WEALTH_FIELD_DEFAULTS: Record<string, string> = {
  "wealth.global.footer-address-line1": "9545 Goodwin St",
  "wealth.global.footer-address-line2": "Detroit, MI 48211",
  "wealth.global.footer-appointment-label": "By Appointment Only",
  "wealth.global.footer-email": "info@detroitcommunitywealth.org",
  "wealth.global.footer-ein": "82-1492642",
  "wealth.global.footer-farm-logo": "/templates/wealth/images/farm-logo.png",
  "wealth.global.footer-farm-url": "https://www.oaklandurbanfarm.org/",
  "wealth.global.footer-farm-alt": "Oakland Avenue Urban Farm",
  "wealth.global.newsletter-heading": "Subscribe",
  "wealth.global.newsletter-body":
    "Sign up with your email address to receive news and updates.",
  // ^ verbatim design.md copy — Phase 4's declared TemplateField default MUST
  // match this string.
  "wealth.global.newsletter-privacy": "We respect your privacy.",
  "wealth.global.nav-resources-url": "/resources",
};

export function resolveWealthFields(
  customFields: unknown,
  keys: string[],
): Record<string, string> {
  const raw =
    customFields != null &&
    typeof customFields === "object" &&
    !Array.isArray(customFields)
      ? (customFields as Record<string, unknown>)
      : {};

  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = raw[key];
    const custom = typeof value === "string" ? value.trim() : undefined;
    out[key] =
      custom && custom.length > 0
        ? custom
        : (WEALTH_FIELD_DEFAULTS[key] ?? "");
  }
  return out;
}
