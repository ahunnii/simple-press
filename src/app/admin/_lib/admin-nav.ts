import type { Icon as TablerIcon } from "@tabler/icons-react";
import type { LucideIcon } from "lucide-react";
import {
  IconBraces,
  IconBrandYoutube,
  IconBrush,
  IconCalendarEvent,
  IconChartBar,
  IconDashboard,
  IconDatabaseExport,
  IconDiscount,
  IconFolder,
  IconImageInPicture,
  IconLanguage,
  IconMail,
  IconMailFast,
  IconMessageStar,
  IconPackage,
  IconPackages,
  IconPhoto,
  IconReceiptTax,
  IconReportMoney,
  IconShoppingCart,
  IconSparkles,
  IconStar,
  IconUsers,
} from "@tabler/icons-react";
import {
  Clock,
  FileText,
  Globe,
  Home,
  Megaphone,
  Menu,
  Package,
  Plug,
  Plus,
  PowerOff,
  Search,
  Shield,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import { getPlatformHubUrl } from "~/lib/domain-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NavSection =
  | "sell"
  | "catalog"
  | "marketing"
  | "content"
  | "insights"
  | "platform";

export type NavHub = "settings" | "content";

/** Business membership roles that can access the admin dashboard. */
export type AdminRole = "OWNER" | "MANAGER" | "STAFF";

/** Roles a nav item is visible to when it declares no explicit `roles`. */
export const DEFAULT_NAV_ROLES: AdminRole[] = ["OWNER", "MANAGER"];

/**
 * Human-readable capability summary for each admin role. Used to explain
 * roles in the team invite dialog and members table.
 *
 * Source of truth: `ownerOnlyProcedure` (src/server/api/trpc.ts) restricts
 * team invite/remove/role-change to OWNER (see src/server/api/routers/team.ts).
 * `ownerAdminProcedure` — which gates products, orders, payments, content,
 * and settings mutations — allows both OWNER and MANAGER. `staffProcedure`
 * additionally allows STAFF, but is only used for fulfillment procedures
 * (orders, customers); see `STAFF_ALLOWED_PATH_PREFIXES` below.
 */
export const ROLE_DESCRIPTIONS: Record<
  AdminRole,
  { label: string; summary: string }
> = {
  OWNER: {
    label: "Owner",
    summary:
      "Full access, including team management, payments, and store settings.",
  },
  MANAGER: {
    label: "Manager",
    summary:
      "Everything an Owner can do except team management — products, orders, payments, content, and settings.",
  },
  STAFF: {
    label: "Staff",
    summary:
      "Fulfillment access only — can view and manage orders and customers.",
  },
};

/** A top-level sidebar navigation item. */
export interface NavItem {
  key: string;
  title: string;
  href: string;
  icon: TablerIcon | LucideIcon;
  section: NavSection;
  featureKey?: string;
  /**
   * Membership roles that can see this item. Defaults to OWNER + MANAGER
   * (`DEFAULT_NAV_ROLES`). Include "STAFF" only for fulfillment-safe pages
   * (orders, customers). PLATFORM_ADMIN always sees everything.
   */
  roles?: AdminRole[];
  /** Keyword synonyms for command palette matching. */
  keywords?: string[];
  /**
   * True when `href` is an absolute URL to a different host (e.g. the
   * `platform.*` subdomain). Consumers must not `router.push()` these —
   * use a plain navigation (`<Link>` renders a real `<a>` for absolute
   * URLs; the command palette falls back to `window.location.href`).
   */
  external?: boolean;
}

/** A card entry shown on a hub index page (Settings or Content). */
export interface HubCard {
  key: string;
  title: string;
  description: string;
  body: string;
  href: string;
  hub: NavHub;
  /** Tailwind color token suffix, e.g. "slate", "emerald". */
  color: string;
  icon: LucideIcon | TablerIcon;
  /** Feature flag key — when set and disabled, the card is hidden from its hub. */
  featureKey?: string;
  /**
   * True when the card links to a platform-admin-only surface (e.g. the
   * legacy Template Fields editor). Hidden from owners/managers everywhere;
   * consumers must opt in via `getHubCards(hub, { includePlatformOnly })`.
   */
  platformOnly?: boolean;
  /** Keyword synonyms for command palette matching. */
  keywords?: string[];
}

/** A quick action for the command palette. */
export interface PaletteAction {
  key: string;
  title: string;
  href: string;
  icon: TablerIcon | LucideIcon;
  keywords?: string[];
  featureKey?: string;
  /**
   * Membership roles that can see this action. Defaults to OWNER + MANAGER
   * (`DEFAULT_NAV_ROLES`). PLATFORM_ADMIN always sees everything.
   */
  roles?: AdminRole[];
}

export const NAV_SECTION_LABELS: Record<NavSection, string> = {
  sell: "Sell",
  catalog: "Catalog",
  marketing: "Marketing",
  content: "Content",
  insights: "Insights",
  platform: "Platform",
};

// ─── Main nav items ───────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  // Sell
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: IconDashboard,
    section: "sell",
  },
  {
    key: "orders",
    title: "Orders",
    href: "/admin/orders",
    icon: IconShoppingCart,
    section: "sell",
    featureKey: "orders",
    roles: ["OWNER", "MANAGER", "STAFF"],
    keywords: ["sales", "purchases", "fulfillment"],
  },
  {
    key: "customers",
    title: "Customers",
    href: "/admin/customers",
    icon: IconUsers,
    section: "sell",
    featureKey: "customerAccounts",
    roles: ["OWNER", "MANAGER", "STAFF"],
    keywords: ["buyers", "shoppers"],
  },

  // Catalog
  {
    key: "products",
    title: "Products",
    href: "/admin/products",
    icon: IconPackage,
    section: "catalog",
    featureKey: "products",
    keywords: ["items", "catalog", "listings", "sku"],
  },
  {
    key: "inventory",
    title: "Inventory",
    href: "/admin/inventory",
    icon: IconPackages,
    section: "catalog",
    featureKey: "inventory",
  },
  {
    key: "collections",
    title: "Collections",
    href: "/admin/collections",
    icon: IconFolder,
    section: "catalog",
    featureKey: "collections",
  },
  {
    key: "services",
    title: "Services",
    href: "/admin/services",
    icon: IconSparkles,
    section: "catalog",
    featureKey: "services",
  },

  // Marketing
  {
    key: "discounts",
    title: "Discounts",
    href: "/admin/discounts",
    icon: IconDiscount,
    section: "marketing",
    featureKey: "coupons",
    keywords: ["coupon", "promo", "promotion", "code", "sale"],
  },
  {
    key: "testimonials",
    title: "Testimonials",
    href: "/admin/testimonials",
    icon: IconStar,
    section: "marketing",
    featureKey: "testimonials",
  },
  {
    key: "reviews",
    title: "Reviews",
    href: "/admin/reviews",
    icon: IconMessageStar,
    section: "marketing",
    featureKey: "reviews",
  },
  {
    key: "galleries",
    title: "Galleries",
    href: "/admin/galleries",
    icon: IconImageInPicture,
    section: "marketing",
    featureKey: "galleries",
  },
  {
    key: "marketing",
    title: "Email Marketing",
    href: "/admin/marketing",
    icon: IconMailFast,
    section: "marketing",
    featureKey: "emailMarketing",
    keywords: ["newsletter", "broadcast", "campaign", "email blast"],
  },

  // Content
  {
    key: "site-editor",
    title: "Site Editor",
    href: "/editor",
    icon: IconBrush,
    section: "content",
    keywords: ["editor", "visual", "design", "theme", "sections", "customize"],
  },
  {
    key: "content",
    title: "Site Content",
    href: "/admin/content",
    icon: IconLanguage,
    section: "content",
  },
  {
    key: "media",
    title: "Media Library",
    href: "/admin/media",
    icon: IconPhoto,
    section: "content",
    featureKey: "media",
    keywords: ["images", "files", "uploads", "library"],
  },
  {
    key: "emails",
    title: "Notification Emails",
    href: "/admin/emails",
    icon: IconMail,
    section: "content",
    keywords: ["notification", "transactional", "order emails"],
  },
  {
    key: "events",
    title: "Events",
    href: "/admin/events",
    icon: IconCalendarEvent,
    section: "content",
    featureKey: "events",
    keywords: ["calendar", "dates", "workshop", "class", "market"],
  },
  {
    key: "videos",
    title: "Videos",
    href: "/admin/videos",
    icon: IconBrandYoutube,
    section: "content",
    featureKey: "videos",
    keywords: ["youtube", "video", "gallery", "channel", "playlist"],
  },

  // Insights
  {
    key: "analytics",
    title: "Analytics",
    href: "/admin/analytics",
    icon: IconChartBar,
    section: "insights",
    featureKey: "analytics",
    keywords: ["stats", "traffic", "visitors", "reports"],
  },
  {
    key: "finances",
    title: "Finances",
    href: "/admin/finances",
    icon: IconReportMoney,
    section: "insights",
    featureKey: "payments",
    keywords: ["revenue", "tax", "fees", "stripe", "profit", "breakdown", "money", "payouts", "balance", "payments", "inform"],
  },

  // Platform (PLATFORM_ADMIN only — gated in sidebar rendering). Points at
  // the dedicated platform-admin subdomain (src/app/platform-hub), which
  // owns users/businesses/domains management — those pages no longer live
  // inside tenant /admin.
  {
    key: "platform-hub",
    title: "Platform Hub",
    href: getPlatformHubUrl("/dashboard"),
    icon: Shield,
    section: "platform",
    external: true,
    keywords: ["users", "businesses", "domains", "platform admin"],
  },
];

// ─── Hub cards ────────────────────────────────────────────────────────────────

export const HUB_CARDS: HubCard[] = [
  // Settings hub
  {
    key: "settings-general",
    title: "General",
    description: "Name, email, address, phone",
    body: "Edit general settings for your business",
    href: "/admin/settings/general",
    hub: "settings",
    color: "slate",
    icon: Home,
  },
  {
    key: "settings-shipping",
    title: "Shipping",
    description: "Rates, free-shipping thresholds, in-store pickup",
    body: "Configure how customers are charged for delivery",
    href: "/admin/settings/shipping",
    hub: "settings",
    color: "emerald",
    icon: Package,
  },
  {
    key: "settings-hours",
    title: "Business Hours",
    description: "Opening hours by day",
    body: "Publish your opening hours on your storefront contact page",
    href: "/admin/settings/hours",
    hub: "settings",
    color: "cyan",
    icon: Clock,
  },
  {
    key: "settings-domain",
    title: "Domain",
    description: "Your business domain and custom domain",
    body: "Manage your business domain and custom domain",
    href: "/admin/settings/domain",
    hub: "settings",
    color: "orange",
    icon: Globe,
    keywords: ["url", "website address", "dns"],
  },
  {
    key: "settings-features",
    title: "Features",
    description: "Fine tune your business",
    body: "Enable or disable features for your business",
    href: "/admin/settings/features",
    hub: "settings",
    color: "indigo",
    icon: Wrench,
  },
  {
    key: "settings-integrations",
    title: "Integrations",
    description: "Stripe payments and Umami analytics",
    body: "Connect your business to third-party services",
    href: "/admin/settings/integrations",
    hub: "settings",
    color: "purple",
    icon: Plug,
  },
  {
    key: "settings-availability",
    title: "Maintenance Mode",
    description: "Take your storefront offline or show a coming-soon page",
    body: "Show a maintenance or coming-soon screen while you prepare your launch",
    href: "/admin/settings/availability",
    hub: "settings",
    color: "red",
    icon: PowerOff,
  },
  {
    key: "settings-data",
    title: "Data & Export",
    description: "Move your store to WordPress/WooCommerce",
    body: "Download your content, products, and records in WordPress/WooCommerce import formats",
    href: "/admin/settings/data",
    hub: "settings",
    color: "blue",
    icon: IconDatabaseExport,
    featureKey: "wordpressExport",
    keywords: [
      "woocommerce",
      "wordpress",
      "offboard",
      "migrate",
      "leave",
      "cancel",
      "export",
      "data",
    ],
  },
  {
    key: "settings-team",
    title: "Team",
    description: "Staff and collaborators",
    body: "Invite team members and manage their roles",
    href: "/admin/settings/team",
    hub: "settings",
    color: "violet",
    icon: IconUsers,
    keywords: ["staff", "members", "invite", "roles", "permissions"],
  },

  // Content hub — Site Editor and Brand Identity first
  {
    key: "content-site-editor",
    title: "Site Editor",
    description: "Edit your site visually",
    body: "Click any section of your live site to change its text, images, and visibility — then publish when you're happy",
    href: "/editor",
    hub: "content",
    color: "indigo",
    icon: Globe,
    keywords: ["editor", "visual", "sections", "theme", "design", "preview"],
  },
  {
    key: "content-branding",
    title: "Brand Identity",
    description: "Personality of your site",
    body: "Edit your logo, template selection, socials, and more",
    href: "/admin/content/branding",
    hub: "content",
    color: "blue",
    icon: Home,
  },
  {
    key: "content-pages",
    title: "Pages",
    description: "Standalone pages (About, Contact)",
    body: "About, Contact, FAQ, and custom pages",
    href: "/admin/content/pages",
    hub: "content",
    color: "green",
    icon: FileText,
    featureKey: "pages",
  },
  {
    key: "content-blog",
    title: "Blog",
    description: "Blog posts",
    body: "Blog posts for your site",
    href: "/admin/content/blog",
    hub: "content",
    color: "purple",
    icon: FileText,
    featureKey: "blog",
  },
  {
    key: "content-policies",
    title: "Policies",
    description: "Privacy, Terms, Refunds, Shipping",
    body: "Privacy, Terms, Refunds, Shipping",
    href: "/admin/content/policies",
    hub: "content",
    color: "purple",
    icon: Shield,
  },
  {
    key: "content-navigation",
    title: "Navigation",
    description: "Menu structure",
    body: "Configure your site menu and links",
    href: "/admin/content/navigation",
    hub: "content",
    color: "orange",
    icon: Menu,
  },
  {
    key: "content-seo",
    title: "SEO & Meta",
    description: "Search optimization",
    body: "Meta tags, favicons, social media preview images",
    href: "/admin/content/seo",
    hub: "content",
    color: "pink",
    icon: Search,
  },
  {
    key: "content-faq",
    title: "FAQ",
    description: "Frequently asked questions",
    body: "Add and manage FAQ items for your storefront",
    href: "/admin/content/faq",
    hub: "content",
    color: "teal",
    icon: FileText,
  },
  {
    key: "content-announcements",
    title: "Banner & Popup",
    description: "Announcement banner and homepage popup",
    body: "Manage your announcement banner and homepage popup",
    href: "/admin/content/announcements",
    hub: "content",
    color: "amber",
    icon: Megaphone,
    keywords: ["announcement", "banner", "popup"],
  },
  {
    key: "content-template",
    title: "Template Fields",
    description: "Platform-admin field editor",
    body: "Raw template field editor with JSON import/export — owners use the Site Editor instead",
    href: "/admin/content/template",
    hub: "content",
    color: "slate",
    icon: IconBraces,
    platformOnly: true,
  },
];

/**
 * Whether a nav item is visible to the given membership role.
 * `role === null` means PLATFORM_ADMIN (or unknown) — no role filtering.
 */
export function isNavItemAllowedForRole(
  item: Pick<NavItem, "roles">,
  role: AdminRole | null,
): boolean {
  if (role === null) return true;
  return (item.roles ?? DEFAULT_NAV_ROLES).includes(role);
}

/** Path prefixes a STAFF member may visit inside /admin. */
const STAFF_ALLOWED_PATH_PREFIXES = ["/admin/orders", "/admin/customers"];

/**
 * Whether an /admin pathname is accessible to the given role.
 * OWNER and MANAGER can visit everything; STAFF is limited to fulfillment
 * pages (orders + customers). Consumed by src/lib/require-admin-access.ts —
 * hard enforcement lives in the tRPC procedure roles.
 */
export function isPathAllowedForRole(
  pathname: string,
  role: AdminRole | null,
): boolean {
  if (role !== "STAFF") return true;
  return STAFF_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Return all hub cards for a given hub. Platform-only cards (legacy/advanced
 * surfaces) are excluded unless the caller opts in for a PLATFORM_ADMIN user.
 */
export function getHubCards(
  hub: NavHub,
  opts?: { includePlatformOnly?: boolean },
): HubCard[] {
  return HUB_CARDS.filter(
    (card) =>
      card.hub === hub && (!card.platformOnly || opts?.includePlatformOnly),
  );
}

// ─── Palette actions ────────────────────────────────────────────────────────

export const PALETTE_ACTIONS: PaletteAction[] = [
  {
    key: "edit-site",
    title: "Edit site",
    href: "/editor",
    icon: Globe,
    keywords: ["site", "editor", "visual", "design", "theme", "sections"],
  },
  {
    key: "add-product",
    title: "Add product",
    href: "/admin/products/new",
    icon: Plus,
    featureKey: "products",
    keywords: ["create", "new", "product"],
  },
  {
    key: "create-discount",
    title: "Create discount",
    href: "/admin/discounts/new",
    icon: Plus,
    featureKey: "coupons",
    keywords: ["coupon", "promo", "code"],
  },
  {
    key: "create-order",
    title: "Create manual order",
    href: "/admin/orders/new",
    icon: Plus,
    featureKey: "orders",
    keywords: ["order", "manual"],
  },
  {
    key: "add-event",
    title: "Add event",
    href: "/admin/events/new",
    icon: Plus,
    featureKey: "events",
    keywords: ["create", "new", "event"],
  },
  {
    key: "add-video",
    title: "Add video",
    // Videos are added through a dialog on the library page, not a dedicated
    // /new route (unlike events) — a video only needs a pasted URL, which
    // oEmbed then expands. Do not "fix" this to /admin/videos/new; that 404s.
    href: "/admin/videos",
    icon: Plus,
    featureKey: "videos",
    keywords: ["create", "new", "video"],
  },
  {
    key: "invite-team",
    title: "Invite team member",
    href: "/admin/settings/team",
    icon: Users,
    keywords: ["staff", "member", "invite"],
  },
  {
    key: "send-broadcast",
    title: "Send email marketing",
    href: "/admin/marketing",
    icon: Zap,
    featureKey: "emailMarketing",
    keywords: ["broadcast", "newsletter", "campaign"],
  },
  {
    key: "setup-guide",
    title: "View setup guide",
    href: "/admin/welcome",
    icon: Home,
    keywords: ["onboarding", "help", "tutorial"],
  },
  {
    key: "business-settings",
    title: "Business settings",
    href: "/admin/settings/general",
    icon: Wrench,
    keywords: ["general", "info", "business"],
  },
  {
    key: "tax-guide",
    title: "Tax Guide",
    href: "/admin/finances/tax-guide",
    icon: IconReceiptTax,
    featureKey: "payments",
    keywords: ["tax", "nexus", "stripe tax", "sales tax", "inform"],
  },
];
