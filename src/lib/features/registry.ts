export type FeatureFlag = {
  key: string; // Unique identifier
  label: string; // Human-readable name
  description: string; // What it does
  category: FeatureCategory;

  // Defaults
  enabledByDefault: boolean;

  // Owner control
  ownerCanToggle: boolean; // Can the business owner toggle this themselves?

  // Dependencies — if this feature is off, these are also hidden
  dependsOn?: string[];

  // If this is off, hide these nav items
  hidesNav?: string[]; // Nav item keys to hide when disabled
};

export type FeatureCategory =
  | "ecommerce" // Products, orders, cart, checkout
  | "content" // Pages, galleries, blog
  | "customers" // Customer management, accounts
  | "marketing" // Testimonials, reviews, email
  | "platform"; // Core platform features (typically always on)

export const FEATURE_REGISTRY: Record<string, FeatureFlag> = {
  // ─── ECOMMERCE ──────────────────────────────────────────────────────────────
  products: {
    key: "products",
    label: "Products",
    description: "Add and manage products in your catalog",
    category: "ecommerce",
    enabledByDefault: true,
    ownerCanToggle: true,
    hidesNav: ["products"],
  },
  orders: {
    key: "orders",
    label: "Orders",
    description: "Receive and manage customer orders",
    category: "ecommerce",
    enabledByDefault: true,
    ownerCanToggle: true,
    dependsOn: ["products"],
    hidesNav: ["orders"],
  },
  cart: {
    key: "cart",
    label: "Shopping Cart & Checkout",
    description: "Allow customers to add items to a cart and check out",
    category: "ecommerce",
    enabledByDefault: true,
    ownerCanToggle: true,
    dependsOn: ["products"],
  },
  inventory: {
    key: "inventory",
    label: "Inventory Management",
    description: "Track stock levels and get low-stock alerts",
    category: "ecommerce",
    enabledByDefault: true,
    ownerCanToggle: true,
    dependsOn: ["products"],
    hidesNav: ["inventory"],
  },
  coupons: {
    key: "coupons",
    label: "Coupons & Discounts",
    description: "Create discount codes and promotional offers",
    category: "ecommerce",
    enabledByDefault: false,
    ownerCanToggle: true,
    dependsOn: ["cart"],
    hidesNav: ["coupons"],
  },
  collections: {
    key: "collections",
    label: "Collections",
    description: "Create collections of products and display them on your site",
    category: "ecommerce",
    enabledByDefault: false,
    ownerCanToggle: true,
    dependsOn: ["products"],
    hidesNav: ["collections"],
  },
  checkout: {
    key: "checkout",
    label: "Checkout",
    description: "Allow customers to checkout and complete their purchase",
    category: "ecommerce",
    enabledByDefault: true,
    ownerCanToggle: true,
    dependsOn: ["products", "cart"],
  },
  payments: {
    key: "payments",
    label: "Payments",
    description: "Allow customers to pay for their purchase",
    category: "ecommerce",
    enabledByDefault: true,
    ownerCanToggle: true,
    dependsOn: ["orders", "cart"],
  },

  // ─── CONTENT ────────────────────────────────────────────────────────────────
  pages: {
    key: "pages",
    label: "Custom Pages",
    description: "Create custom content pages for your site",
    category: "content",
    enabledByDefault: true,
    ownerCanToggle: false,
    hidesNav: ["pages"],
  },
  galleries: {
    key: "galleries",
    label: "Galleries",
    description: "Create and manage image galleries",
    category: "content",
    enabledByDefault: true,
    ownerCanToggle: true,
    hidesNav: ["galleries"],
  },
  embeds: {
    key: "embeds",
    label: "Embeds",
    description: "Embed external content (booking widgets, videos, social posts) into pages and rich text",
    category: "content",
    enabledByDefault: false,
    ownerCanToggle: true,
  },
  blog: {
    key: "blog",
    label: "Blog",
    description: "Publish blog posts and articles",
    category: "content",
    enabledByDefault: false,
    ownerCanToggle: true,
    hidesNav: ["blog"],
  },

  // ─── CUSTOMERS ──────────────────────────────────────────────────────────────
  customerAccounts: {
    key: "customerAccounts",
    label: "Customer Accounts",
    description: "Allow customers to create accounts and log in",
    category: "customers",
    enabledByDefault: true,
    ownerCanToggle: false,
    hidesNav: ["customers"],
  },

  // ─── MARKETING ──────────────────────────────────────────────────────────────
  testimonials: {
    key: "testimonials",
    label: "Testimonials",
    description: "Collect and display customer testimonials",
    category: "marketing",
    enabledByDefault: true,
    ownerCanToggle: true,
    hidesNav: ["testimonials"],
  },
  reviews: {
    key: "reviews",
    label: "Product Reviews",
    description: "Allow customers to review products",
    category: "marketing",
    enabledByDefault: false,
    ownerCanToggle: false,
    dependsOn: ["products", "customerAccounts"],
    hidesNav: ["reviews"],
  },
  contactForm: {
    key: "contactForm",
    label: "Contact Form",
    description: "Show a contact form on your site",
    category: "marketing",
    enabledByDefault: true,
    ownerCanToggle: false,
  },
};

// Ordered category labels for display
export const CATEGORY_META: Record<
  FeatureCategory,
  { label: string; description: string; icon: string }
> = {
  ecommerce: {
    label: "E-Commerce",
    description: "Selling products and managing orders",
    icon: "🛒",
  },
  content: {
    label: "Content",
    description: "Pages, galleries, and media",
    icon: "📝",
  },
  customers: {
    label: "Customers",
    description: "Customer accounts and management",
    icon: "👥",
  },
  marketing: {
    label: "Marketing",
    description: "Reviews, testimonials, and outreach",
    icon: "📣",
  },
  platform: {
    label: "Platform",
    description: "Core platform features",
    icon: "⚙️",
  },
};

// Get all features disabled because a dependency is off
export function getDisabledDueToDependency(
  flags: Record<string, boolean>,
): Set<string> {
  const disabled = new Set<string>();

  for (const [key, feature] of Object.entries(FEATURE_REGISTRY)) {
    if (feature.dependsOn) {
      const missingDep = feature.dependsOn.some((dep) => flags[dep] === false);
      if (missingDep) {
        disabled.add(key);
      }
    }
  }

  return disabled;
}

// Build the default flags object for a new business
export function getDefaultFlags(): Record<string, boolean> {
  return Object.fromEntries(
    Object.entries(FEATURE_REGISTRY).map(([key, feature]) => [
      key,
      feature.enabledByDefault,
    ]),
  );
}
