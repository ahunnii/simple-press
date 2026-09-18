/**
 * Reads `dream.*` custom fields out of `business.siteContent.customFields`
 * with defaults, mirroring `wealth/lib/resolve-fields.ts`: chrome (layout,
 * header, footer, topbar) needs a resolver before the root `index.ts` (which
 * owns the actual `TemplateField` declarations, defaults, labels, and
 * groups) can build its `Map<string, TemplateField>`. This hardcodes the
 * same default values the root `index.ts` declares — when a field's
 * `defaultValue` changes there, this record MUST change with it or an
 * owner's unset field would silently render differently in chrome vs. the
 * editor's default-value preview.
 *
 * Trim-then-default (not `??`): an owner who saves an empty string in the
 * visual editor means "use the default" — same convention as
 * `resolveTemplateFields`.
 */

export const DREAM_FIELD_DEFAULTS: Record<string, string> = {
  "dream.global.announcement-text":
    "Dream Your Theme · Event Decor · Rentals · Draping",
  "dream.global.announcement-url": "",
  "dream.global.announcement-link-label": "",
  "dream.global.header-cta-label": "Estimate Quote",
  "dream.global.header-cta-url": "/contact",
  "dream.global.footer-signoff": "Your dreams become",
  "dream.global.footer-signoff-accent": "a theme.",
  "dream.global.service-area": "Serving the metro area and beyond.",
  // Optional supplementary line under the footer sign-off — empty default,
  // per field-conventions.md's "Optional content" rule; hidden when blank.
  "dream.global.footer-tagline": "",
  "dream.global.contact-email": "",
  "dream.global.contact-phone": "",
  "dream.global.contact-hours": "",
  "dream.global.authentication-image": "/placeholder.svg",
  "dream.global.logo-size-width": "80",
  "dream.global.logo-size-height": "80",
};

export function resolveDreamFields(
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
      custom && custom.length > 0 ? custom : (DREAM_FIELD_DEFAULTS[key] ?? "");
  }
  return out;
}
