export const TEMPLATE_FIELDS: Record<
  string,
  Array<{
    key: string;
    label: string;
    description: string;
    type: "text" | "textarea" | "url";
  }>
> = {
  modern: [
    {
      key: "modern.banner.text",
      label: "Banner Text",
      description: "Text shown in the top banner",
      type: "text",
    },
    {
      key: "modern.cta.primary",
      label: "Primary CTA Text",
      description: "Main call-to-action button text",
      type: "text",
    },
    {
      key: "modern.cta.secondary",
      label: "Secondary CTA Text",
      description: "Secondary call-to-action button text",
      type: "text",
    },
    {
      key: "modern.announcement",
      label: "Announcement",
      description: "Special announcement or promo message",
      type: "textarea",
    },
  ],
  elegant: [
    {
      key: "elegant.tagline",
      label: "Tagline",
      description: "Your store's tagline",
      type: "text",
    },
    {
      key: "elegant.cta.background",
      label: "CTA Background",
      description: "Background image for the CTA banner",
      type: "text",
    },
    {
      key: "elegant.homepage.about.title",
      label: "Homepage About Title",
      description: "Title for the About section on the homepage",
      type: "text",
    },
    {
      key: "elegant.homepage.about.text",
      label: "Homepage About Text",
      description: "Text for the About section on the homepage",
      type: "textarea",
    },
    {
      key: "elegant.homepage.about.image",
      label: "Homepage About Image",
      description: "Image for the About section on the homepage",
      type: "text",
    },
    {
      key: "elegant.cta.title",
      label: "CTA Title",
      description: "Title for the CTA banner",
      type: "text",
    },
    {
      key: "elegant.cta.pointone",
      label: "CTA Point One",
      description: "First point for the CTA banner",
      type: "text",
    },
    {
      key: "elegant.cta.pointtwo",
      label: "CTA Point Two",
      description: "Second point for the CTA banner",
      type: "text",
    },
    {
      key: "elegant.cta.pointthree",
      label: "CTA Point Three",
      description: "Third point for the CTA banner",
      type: "text",
    },
  ],
  vintage: [
    {
      key: "vintage.tagline",
      label: "Tagline",
      description: "Your store's tagline",
      type: "text",
    },
    {
      key: "vintage.welcome",
      label: "Welcome Message",
      description: "Greeting message for visitors",
      type: "textarea",
    },
    {
      key: "vintage.signature",
      label: "Signature",
      description: "Personal signature or sign-off",
      type: "text",
    },
  ],
  minimal: [
    {
      key: "minimal.motto",
      label: "Motto",
      description: "Short motto or slogan",
      type: "text",
    },
    {
      key: "minimal.statement",
      label: "Brand Statement",
      description: "Your brand's mission statement",
      type: "textarea",
    },
  ],
};

/**
 * Returns only the custom field values that belong to the given template.
 * Keys are those defined in TEMPLATE_FIELDS for that templateId; missing values default to "".
 * Accepts Prisma JsonValue (e.g. from siteContent.customFields).
 */
export function getThemeFields(
  templateId: string,
  customFields: unknown,
): Record<string, string> {
  const fields = TEMPLATE_FIELDS[templateId] ?? [];
  const raw =
    customFields != null &&
    typeof customFields === "object" &&
    !Array.isArray(customFields)
      ? (customFields as Record<string, unknown>)
      : {};
  const result: Record<string, string> = {};
  for (const field of fields) {
    const value = raw[field.key];
    result[field.key] = typeof value === "string" ? value : "";
  }
  return result;
}
