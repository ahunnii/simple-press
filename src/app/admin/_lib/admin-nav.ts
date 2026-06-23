import type { LucideIcon } from "lucide-react";
import type { Icon as TablerIcon } from "@tabler/icons-react";
import {
  FileText,
  Globe,
  Home,
  Megaphone,
  Menu,
  Package,
  PowerOff,
  Search,
  Shield,
  Wrench,
} from "lucide-react";
import {
  IconChartBar,
  IconCreditCard,
  IconDashboard,
  IconDiscount,
  IconFolder,
  IconImageInPicture,
  IconLanguage,
  IconMessageStar,
  IconPackage,
  IconPackages,
  IconPhoto,
  IconReceiptTax,
  IconShoppingCart,
  IconSparkles,
  IconStar,
  IconUsers,
} from "@tabler/icons-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NavSection =
  | "sell"
  | "catalog"
  | "marketing"
  | "content"
  | "insights";

export type NavHub = "settings" | "content";

/** A top-level sidebar navigation item. */
export interface NavItem {
  key: string;
  title: string;
  href: string;
  icon: TablerIcon | LucideIcon;
  section: NavSection;
  featureKey?: string;
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
}

export const NAV_SECTION_LABELS: Record<NavSection, string> = {
  sell: "Sell",
  catalog: "Catalog",
  marketing: "Marketing",
  content: "Content",
  insights: "Insights",
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
  },
  {
    key: "customers",
    title: "Customers",
    href: "/admin/customers",
    icon: IconUsers,
    section: "sell",
  },
  {
    key: "payments",
    title: "Payments",
    href: "/admin/payments",
    icon: IconCreditCard,
    section: "sell",
    featureKey: "payments",
  },

  // Catalog
  {
    key: "products",
    title: "Products",
    href: "/admin/products",
    icon: IconPackage,
    section: "catalog",
    featureKey: "products",
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
  },

  // Insights
  {
    key: "analytics",
    title: "Analytics",
    href: "/admin/analytics",
    icon: IconChartBar,
    section: "insights",
    featureKey: "analytics",
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

  // Content hub
  {
    key: "content-branding",
    title: "Brand Identity ",
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
    description: "Pages",
    body: "About, Contact, FAQ, and custom pages",
    href: "/admin/content/pages",
    hub: "content",
    color: "green",
    icon: FileText,
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
    description: "Policies",
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
    key: "content-template",
    title: "Template Fields",
    description: "Custom content",
    body: "Template-specific custom fields",
    href: "/admin/content/template",
    hub: "content",
    color: "indigo",
    icon: Globe,
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

/** Return all hub cards for a given hub. */
export function getHubCards(hub: NavHub): HubCard[] {
  return HUB_CARDS.filter((card) => card.hub === hub);
}
