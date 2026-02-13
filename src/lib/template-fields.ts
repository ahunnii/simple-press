export type TemplateField = {
  key: string;
  label: string;
  description: string;
  type: "text" | "textarea" | "url" | "color" | "number";
  page:
    | "homepage"
    | "contact"
    | "product"
    | "products"
    | "about"
    | "cart"
    | "checkout"
    | "global";
};

export const TEMPLATE_FIELDS: Record<string, TemplateField[]> = {
  modern: [
    {
      key: "modern.banner.text",
      label: "Banner Text",
      description: "Text shown in the top banner",
      type: "text",
      page: "global",
    },
    {
      key: "modern.cta.primary",
      label: "Primary CTA Text",
      description: "Main call-to-action button text",
      type: "text",
      page: "homepage",
    },
    {
      key: "modern.cta.secondary",
      label: "Secondary CTA Text",
      description: "Secondary call-to-action button text",
      type: "text",
      page: "homepage",
    },
    {
      key: "modern.announcement",
      label: "Announcement",
      description: "Special announcement or promo message",
      type: "textarea",
      page: "global",
    },
  ],
  elegant: [
    {
      key: "elegant.tagline",
      label: "Tagline",
      description: "Your store's tagline",
      type: "text",
      page: "global",
    },
    {
      key: "elegant.cta.background",
      label: "CTA Background",
      description: "Background image for the CTA banner",
      type: "text",
      page: "homepage",
    },
    {
      key: "elegant.homepage.about.title",
      label: "Homepage About Title",
      description: "Title for the About section on the homepage",
      type: "text",
      page: "homepage",
    },
    {
      key: "elegant.homepage.about.text",
      label: "Homepage About Text",
      description: "Text for the About section on the homepage",
      type: "textarea",
      page: "homepage",
    },
    {
      key: "elegant.homepage.about.image",
      label: "Homepage About Image",
      description: "Image for the About section on the homepage",
      type: "text",
      page: "homepage",
    },
    {
      key: "elegant.cta.title",
      label: "CTA Title",
      description: "Title for the CTA banner",
      type: "text",
      page: "homepage",
    },
    {
      key: "elegant.cta.pointone",
      label: "CTA Point One",
      description: "First point for the CTA banner",
      type: "text",
      page: "homepage",
    },
    {
      key: "elegant.cta.pointtwo",
      label: "CTA Point Two",
      description: "Second point for the CTA banner",
      type: "text",
      page: "homepage",
    },
    {
      key: "elegant.cta.pointthree",
      label: "CTA Point Three",
      description: "Third point for the CTA banner",
      type: "text",
      page: "homepage",
    },
  ],
  vintage: [
    {
      key: "vintage.tagline",
      label: "Tagline",
      description: "Your store's tagline",
      type: "text",
      page: "global",
    },
    {
      key: "vintage.welcome",
      label: "Welcome Message",
      description: "Greeting message for visitors",
      type: "textarea",
      page: "global",
    },
    {
      key: "vintage.signature",
      label: "Signature",
      description: "Personal signature or sign-off",
      type: "text",
      page: "global",
    },
  ],
  minimal: [
    {
      key: "minimal.motto",
      label: "Motto",
      description: "Short motto or slogan",
      type: "text",
      page: "global",
    },
    {
      key: "minimal.statement",
      label: "Brand Statement",
      description: "Your brand's mission statement",
      type: "textarea",
      page: "global",
    },
  ],
  "dark-trend": [
    {
      key: "dark-trend.first-section-title",
      label: "First Section Title",
      description: "Title for the first section",
      type: "text",
      page: "homepage",
    },
    {
      key: "dark-trend.first-section-image",
      label: "First Section Image",
      description: "Image for the first section",
      type: "url",
      page: "homepage",
    },
    {
      key: "dark-trend.first-section-button-text",
      label: "First Section Button Text",
      description: "Button text for the first section",
      type: "text",
      page: "homepage",
    },
    {
      key: "dark-trend.first-section-button-link",
      label: "First Section Button Link",
      description: "Button link for the first section",
      type: "url",
      page: "homepage",
    },
    {
      key: "dark-trend.first-section-description",
      label: "First Section Description",
      description: "Description for the first section",
      type: "textarea",
      page: "homepage",
    },

    {
      key: "dark-trend.first-section-subheader",
      label: "First Section Subheader",
      description: "Subheader for the first section",
      type: "text",
      page: "homepage",
    },
    {
      key: "dark-trend.second-section-title",
      label: "Second Section Title",
      description: "Title for the second section",
      type: "text",
      page: "homepage",
    },
    {
      key: "dark-trend.second-section-description",
      label: "Second Section Description",
      description: "Description for the second section",
      type: "textarea",
      page: "homepage",
    },
    {
      key: "dark-trend.second-section-image",
      label: "Second Section Image",
      description: "Image for the second section",
      type: "url",
      page: "homepage",
    },
    {
      key: "dark-trend.cta-header",
      label: "CTA Header",
      description: "Header for the CTA section",
      type: "text",
      page: "homepage",
    },
    {
      key: "dark-trend.cta-description",
      label: "CTA Description",
      description: "Description for the CTA section",
      type: "textarea",
      page: "homepage",
    },
    {
      key: "dark-trend.cta-button-text",
      label: "CTA Button Text",
      description: "Button text for the CTA section",
      type: "text",
      page: "homepage",
    },
    {
      key: "dark-trend.cta-button-link",
      label: "CTA Button Link",
      description: "Button link for the CTA section",
      type: "url",
      page: "homepage",
    },
    {
      key: "dark-trend.cta-image",
      label: "CTA Image",
      description: "Image for the CTA section",
      type: "url",
      page: "homepage",
    },
    {
      key: "dark-trend.about.first-image",
      label: "About First Image",
      description: "Image for the first section of the about page",
      type: "url",
      page: "about",
    },
    {
      key: "dark-trend.about.second-image",
      label: "About Second Image",
      description: "Image for the second section of the about page",
      type: "url",
      page: "about",
    },
    {
      key: "dark-trend.about.header",
      label: "About Header",
      description: "Header for the about page",
      type: "text",
      page: "about",
    },
    {
      key: "dark-trend.about.subheader",
      label: "About Subheader",
      description: "Subheader for the about page",
      type: "text",
      page: "about",
    },
    {
      key: "dark-trend.about.button",
      label: "About Button",
      description: "Button for the about page",
      type: "text",
      page: "about",
    },
    {
      key: "dark-trend.about.button-link",
      label: "About Button Link",
      description: "Button link for the about page",
      type: "url",
      page: "about",
    },
    {
      key: "dark-trend.about.cta-header",
      label: "About CTA Header",
      description: "CTA header for the about page",
      type: "text",
      page: "about",
    },
    {
      key: "dark-trend.about.feature-1-header",
      label: "About Feature 1 Header",
      description: "Feature 1 header for the about page",
      type: "text",
      page: "about",
    },
    {
      key: "dark-trend.about.feature-1-description",
      label: "About Feature 1 Description",
      description: "Feature 1 description for the about page",
      type: "textarea",
      page: "about",
    },
    {
      key: "dark-trend.about.feature-2-header",
      label: "About Feature 2 Header",
      description: "Feature 2 header for the about page",
      type: "text",
      page: "about",
    },
    {
      key: "dark-trend.about.feature-2-description",
      label: "About Feature 2 Description",
      description: "Feature 2 description for the about page",
      type: "textarea",
      page: "about",
    },

    {
      key: "dark-trend.about.feature-3-header",
      label: "About Feature 3 Header",
      description: "Feature 3 header for the about page",
      type: "text",
      page: "about",
    },
    {
      key: "dark-trend.about.feature-3-description",
      label: "About Feature 3 Description",
      description: "Feature 3 description for the about page",
      type: "textarea",
      page: "about",
    },

    {
      key: "dark-trend.about.cta-description",
      label: "About CTA Description",
      description: "CTA description for the about page",
      type: "textarea",
      page: "about",
    },
    {
      key: "dark-trend.about.cta-button-text",
      label: "About CTA Button Text",
      description: "CTA button text for the about page",
      type: "text",
      page: "about",
    },
    {
      key: "dark-trend.about.cta-button-link",
      label: "About CTA Button Link",
      description: "CTA button link for the about page",
      type: "url",
      page: "about",
    },
    {
      key: "dark-trend.contact.header",
      label: "Contact Header",
      description: "Header for the contact page",
      type: "text",
      page: "contact",
    },
    {
      key: "dark-trend.contact.subheader",
      label: "Contact Subheader",
      description: "Subheader for the contact page",
      type: "text",
      page: "contact",
    },
    {
      key: "dark-trend.contact.description",
      label: "Contact Description",
      description: "Description for the contact page",
      type: "textarea",
      page: "contact",
    },
    {
      key: "dark-trend.contact.image",
      label: "Contact Image",
      description: "Image for the contact page",
      type: "url",
      page: "contact",
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

// Helper to group fields by page
export function groupFieldsByPage(
  templateId: string,
): Record<string, TemplateField[]> {
  const fields = TEMPLATE_FIELDS[templateId] ?? [];
  const grouped: Record<string, TemplateField[]> = {};

  fields.forEach((field) => {
    if (!grouped[field.page ?? "global"]) {
      grouped[field.page] = [];
    }
    grouped[field.page]!.push(field);
  });

  return grouped;
}

// Page metadata
export const PAGE_METADATA = {
  global: {
    title: "Global",
    description: "Site-wide elements like headers and announcements",
    icon: "🌐",
  },
  homepage: {
    title: "Homepage",
    description: "Main landing page content",
    icon: "🏠",
  },
  products: {
    title: "Products",
    description: "Product listing and collection pages",
    icon: "📦",
  },
  product: {
    title: "Product",
    description: "Individual product page content",
    icon: "🏷️",
  },
  cart: {
    title: "Cart",
    description: "Shopping cart page content",
    icon: "🛒",
  },
  checkout: {
    title: "Checkout",
    description: "Checkout and order confirmation",
    icon: "💳",
  },
  contact: {
    title: "Contact",
    description: "Contact page content",
    icon: "📧",
  },
  about: {
    title: "About",
    description: "About page content",
    icon: "ℹ️",
  },
} as const;
