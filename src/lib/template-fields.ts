import { darkTrendData } from "~/app/(storefront)/_templates/dark-trend";
import {
  pollenData,
  pollenFieldGroups,
} from "~/app/(storefront)/_templates/pollen";

export type TemplateField = {
  key: string;
  label: string;
  description: string;
  type: "text" | "textarea" | "url" | "color" | "number" | "gallery" | "image";
  page:
    | "homepage"
    | "contact"
    | "product"
    | "products"
    | "about"
    | "cart"
    | "checkout"
    | "global";
  defaultValue?: string;

  // NEW: Grouping and layout
  group?: string; // Fields with same group render together
  gridColumn?: string; // Tailwind grid column classes (e.g., "col-span-2")
  placeholder?: string; // Override description as placeholder
};

export type TemplateFieldGroup = {
  id: string;
  title: string;
  description?: string;
  icon?: string; // Emoji or icon identifier
  columns?: number; // Grid columns (1-3, default 1)
};

// Define groups for each template
export const TEMPLATE_FIELD_GROUPS: Record<string, TemplateFieldGroup[]> = {
  modern: [
    // Global groups
    {
      id: "global.announcement",
      title: "Announcement Banner",
      description: "Top banner that appears across all pages",
      icon: "📢",
      columns: 2,
    },
    {
      id: "global.branding",
      title: "Branding",
      description: "Brand colors and styling",
      icon: "🎨",
      columns: 2,
    },

    // Homepage groups
    {
      id: "homepage.hero",
      title: "Hero Section",
      description: "Main banner area at the top of homepage",
      icon: "🎯",
      columns: 1,
    },
    {
      id: "homepage.cta",
      title: "Call-to-Action Buttons",
      description: "Primary and secondary action buttons",
      icon: "🔘",
      columns: 2,
    },
    {
      id: "homepage.featured",
      title: "Featured Section",
      description: "Highlighted products or content area",
      icon: "⭐",
      columns: 1,
    },
    {
      id: "homepage.social",
      title: "Social Proof",
      description: "Customer count, ratings, testimonials",
      icon: "👥",
      columns: 3,
    },

    // Product groups
    {
      id: "product.badges",
      title: "Product Badges",
      description: "Labels for new, sale, featured products",
      icon: "🏷️",
      columns: 3,
    },
    {
      id: "product.details",
      title: "Product Details",
      description: "Additional product information",
      icon: "📋",
      columns: 1,
    },

    // Cart groups
    {
      id: "cart.empty",
      title: "Empty Cart State",
      description: "Messages when cart is empty",
      icon: "🛒",
      columns: 1,
    },
    {
      id: "cart.incentives",
      title: "Cart Incentives",
      description: "Free shipping, discounts, etc.",
      icon: "🎁",
      columns: 2,
    },
  ],
  ...pollenFieldGroups,
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
      key: "modern.homepage.gallery",
      label: "Homepage Gallery",
      description: "Gallery to display on homepage",
      type: "gallery",
      page: "homepage",
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

  ...darkTrendData,
  ...pollenData,
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

export function groupFieldsByGroup(
  fields: TemplateField[],
): Record<string, TemplateField[]> {
  const grouped: Record<string, TemplateField[]> = {
    ungrouped: [], // Fields without a group
  };

  fields.forEach((field) => {
    const groupId = field.group ?? "ungrouped";
    grouped[groupId] ??= [];
    grouped[groupId].push(field);
  });

  return grouped;
}

// Helper to get group metadata
export function getGroupMetadata(
  templateId: string,
  groupId: string,
): TemplateFieldGroup | undefined {
  return TEMPLATE_FIELD_GROUPS[templateId]?.find((g) => g.id === groupId);
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
