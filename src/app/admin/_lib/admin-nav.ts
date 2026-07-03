import type { Icon as TablerIcon } from "@tabler/icons-react";
import type { LucideIcon } from "lucide-react";
import {
  IconChartBar,
  IconCreditCard,
  IconDashboard,
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
  IconShoppingCart,
  IconSparkles,
  IconStar,
  IconTransfer,
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
  {
    key: "payments",
    title: "Payments",
    href: "/admin/payments",
    icon: IconCreditCard,
    section: "sell",
    featureKey: "payments",
    keywords: ["stripe", "payouts", "balance"],
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
    key: "content",
    title: "Site content",
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
    body: "Publish your opening hours for your storefront footer and contact page",
    href: "/admin/settings/hours",
    hub: "settings",
    color: "cyan",
    icon: Clock,
  },
  {
    key: "settings-tax",
    title: "Tax",
    description: "Sales tax, Stripe Tax, nexus guide",
    body: "Set up and understand your tax obligations",
    href: "/admin/settings/tax",
    hub: "settings",
    color: "yellow",
    icon: IconReceiptTax,
  },
  {
    key: "settings-domain",
    title: "Domain",
    description: "Your business domain and custom domain",
    body: "Manage your business domain and custom domain",
    href: "/admin/settings/domain",
    hub: "settings",
    color: "orange",
    icon: Shield,
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
    description: "Payment gateways, email marketing, analytics, and more.",
    body: "Connect your business to third-party services",
    href: "/admin/settings/integrations",
    hub: "settings",
    color: "purple",
    icon: FileText,
  },
  {
    key: "settings-availability",
    title: "Storefront Availability",
    description: "Maintenance mode and coming soon",
    body: "Temporarily take your storefront offline for maintenance or launch preparation",
    href: "/admin/settings/availability",
    hub: "settings",
    color: "red",
    icon: PowerOff,
  },
  {
    key: "settings-store-transfer",
    title: "Store Transfer",
    description: "Export and import store content",
    body: "Export your store's content to a ZIP file and import it into another store",
    href: "/admin/settings/store-transfer",
    hub: "settings",
    color: "emerald",
    icon: IconTransfer,
    featureKey: "storeTransfer",
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

  // Content hub — Brand Identity and Template Fields first
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
    key: "content-template",
    title: "Template Fields",
    description: "Edit your storefront sections",
    body: "Customize your homepage, hero, and other built-in storefront sections with live preview",
    href: "/admin/content/template",
    hub: "content",
    color: "indigo",
    icon: Globe,
  },
  {
    key: "content-pages",
    title: "Pages",
    description: "Standalone pages (About, Contact, FAQ)",
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
    description: "Site-wide announcements",
    body: "Manage your announcement banner and homepage popup",
    href: "/admin/content/announcements",
    hub: "content",
    color: "amber",
    icon: Megaphone,
  },
];

/** Return all nav items belonging to a section. */
export function getNavItemsBySection(section: NavSection): NavItem[] {
  return NAV_ITEMS.filter((item) => item.section === section);
}

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
 * pages (orders + customers). Used by the admin layout as a UX guard —
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

/** Return all hub cards for a given hub. */
export function getHubCards(hub: NavHub): HubCard[] {
  return HUB_CARDS.filter((card) => card.hub === hub);
}

// ─── Palette actions ────────────────────────────────────────────────────────

export const PALETTE_ACTIONS: PaletteAction[] = [
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
];
