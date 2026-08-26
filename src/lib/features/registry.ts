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
  },
  orders: {
    key: "orders",
    label: "Orders",
    description: "Receive and manage customer orders",
    category: "ecommerce",
    enabledByDefault: true,
    ownerCanToggle: true,
    dependsOn: ["products"],
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
  },
  coupons: {
    key: "coupons",
    label: "Coupons & Discounts",
    description: "Create discount codes and promotional offers",
    category: "ecommerce",
    enabledByDefault: false,
    ownerCanToggle: true,
    dependsOn: ["cart"],
  },
  collections: {
    key: "collections",
    label: "Collections",
    description: "Create collections of products and display them on your site",
    category: "ecommerce",
    enabledByDefault: false,
    ownerCanToggle: true,
    dependsOn: ["products"],
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
  wishlist: {
    key: "wishlist",
    label: "Wishlist",
    description:
      "Let shoppers save products to a wishlist (heart icons on product cards and a wishlist page)",
    category: "ecommerce",
    enabledByDefault: true,
    ownerCanToggle: true,
    dependsOn: ["products"],
  },
  backInStock: {
    key: "backInStock",
    label: "Back-in-Stock Notifications",
    description:
      "Show a 'notify me' form on out-of-stock products and email shoppers when items are restocked",
    category: "ecommerce",
    enabledByDefault: true,
    ownerCanToggle: true,
    dependsOn: ["products"],
  },

  // ─── CONTENT ────────────────────────────────────────────────────────────────
  pages: {
    key: "pages",
    label: "Custom Pages",
    description: "Create custom content pages for your site",
    category: "content",
    enabledByDefault: true,
    ownerCanToggle: false,
  },
  galleries: {
    key: "galleries",
    label: "Galleries",
    description: "Create and manage image galleries",
    category: "content",
    enabledByDefault: true,
    ownerCanToggle: true,
  },
  embeds: {
    key: "embeds",
    label: "Embeds",
    description:
      "Embed external content (booking widgets, videos, social posts) into pages and rich text",
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
  },
  services: {
    key: "services",
    label: "Services",
    description: "Offer bookable services with external booking widgets",
    category: "content",
    enabledByDefault: false,
    ownerCanToggle: true,
  },
  events: {
    key: "events",
    label: "Events",
    description: "Publish upcoming events with fliers, dates, and locations",
    category: "content",
    enabledByDefault: false,
    ownerCanToggle: true,
  },
  videos: {
    key: "videos",
    label: "Videos",
    description:
      "Show YouTube videos on your site, synced automatically from your channels and playlists",
    category: "content",
    enabledByDefault: false,
    ownerCanToggle: true,
  },
  media: {
    key: "media",
    label: "Media Library",
    description: "Browse, download, and manage uploaded media files",
    category: "content",
    enabledByDefault: true,
    ownerCanToggle: true,
  },
  // NOTE: `storeTransfer` used to live here. Store Transfer is now a
  // PLATFORM_ADMIN-only tool (staging→prod moves, site duplication) rendered on
  // /admin/settings/data and gated by platform role, not by a business flag —
  // so there is deliberately no owner-facing toggle for it. Stored
  // `storeTransfer` values left over in `Business.featureFlags` are ignored by
  // `resolveFlags` (unknown keys are dropped).
  wordpressExport: {
    key: "wordpressExport",
    label: "Export to WordPress",
    description:
      "Download your content, products, and records in WordPress/WooCommerce import formats",
    category: "content",
    enabledByDefault: false,
    ownerCanToggle: true,
  },

  // ─── CUSTOMERS ──────────────────────────────────────────────────────────────
  customerAccounts: {
    key: "customerAccounts",
    label: "Customer Accounts",
    description: "Allow customers to create accounts and log in",
    category: "customers",
    enabledByDefault: true,
    ownerCanToggle: false,
  },

  // ─── MARKETING ──────────────────────────────────────────────────────────────
  analytics: {
    key: "analytics",
    label: "Analytics",
    description: "View visitor, page, and event analytics for your storefront",
    category: "marketing",
    enabledByDefault: false,
    ownerCanToggle: true,
  },
  dashboardSearchReadiness: {
    key: "dashboardSearchReadiness",
    label: "Search readiness on dashboard",
    description:
      "Show the search-readiness score strip on your dashboard. The full report stays under Site Setup → SEO & Meta.",
    category: "marketing",
    enabledByDefault: true,
    ownerCanToggle: true,
  },
  testimonials: {
    key: "testimonials",
    label: "Testimonials",
    description: "Collect and display customer testimonials",
    category: "marketing",
    enabledByDefault: true,
    ownerCanToggle: true,
  },
  reviews: {
    key: "reviews",
    label: "Product Reviews",
    description: "Allow customers to review products",
    category: "marketing",
    enabledByDefault: false,
    ownerCanToggle: true,
    dependsOn: ["products", "customerAccounts"],
  },
  contactForm: {
    key: "contactForm",
    label: "Contact Form",
    description: "Show a contact form on your site",
    category: "marketing",
    enabledByDefault: true,
    ownerCanToggle: false,
  },
  banners: {
    key: "banners",
    label: "Announcement Banner",
    description:
      "Show a site-wide announcement bar at the top of your storefront",
    category: "marketing",
    enabledByDefault: false,
    ownerCanToggle: true,
  },
  popups: {
    key: "popups",
    label: "Homepage Popup",
    description: "Show a dismissible popup on your homepage",
    category: "marketing",
    enabledByDefault: false,
    ownerCanToggle: true,
  },
  emailMarketing: {
    key: "emailMarketing",
    label: "Email Marketing",
    description:
      "Send one-off announcement and newsletter emails to customers who opted in to marketing",
    category: "marketing",
    enabledByDefault: false,
    ownerCanToggle: true,
  },
  quoteCalculator: {
    key: "quoteCalculator",
    label: "Quote Calculator",
    description:
      "Build multi-step quote calculators visitors fill out to request an estimate",
    category: "marketing",
    enabledByDefault: false,
    ownerCanToggle: true,
  },
  quickbooks: {
    key: "quickbooks",
    label: "QuickBooks Invoicing",
    description:
      "Send deposit and final invoices through a connected QuickBooks Online company",
    category: "ecommerce",
    enabledByDefault: false,
    ownerCanToggle: true,
  },
  subscriptions: {
    key: "subscriptions",
    label: "Product Subscriptions",
    description:
      "Let customers subscribe to a product on a recurring schedule (weekly to every 3 months), billed through your connected Stripe account. Customers manage or cancel from a link in their emails.",
    category: "ecommerce",
    enabledByDefault: false,
    ownerCanToggle: true,
    dependsOn: ["products", "payments"],
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
