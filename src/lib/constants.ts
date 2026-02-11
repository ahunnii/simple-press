export const PLATFORM_CONFIG = {
  name: "Shop Platform",
  domain: process.env.PLATFORM_DOMAIN ?? "shop-app.mycoolifyserver.com",
  supportEmail: "support@shopplatform.com",
} as const;

export const TEMPLATE_IDS = {
  MODERN: "modern",
  VINTAGE: "vintage",
  MINIMAL: "minimal",
} as const;

export const TEMPLATES = [
  {
    id: TEMPLATE_IDS.MODERN,
    name: "Modern",
    description:
      "Clean and contemporary design perfect for fashion, tech, or lifestyle brands",
    previewImage: "/templates/modern-preview.png",
  },
  {
    id: TEMPLATE_IDS.VINTAGE,
    name: "Vintage",
    description:
      "Classic design ideal for artisan goods, antiques, or heritage brands",
    previewImage: "/templates/vintage-preview.png",
  },
  {
    id: TEMPLATE_IDS.MINIMAL,
    name: "Minimal",
    description:
      "Ultra-clean design for luxury brands or professional services",
    previewImage: "/templates/minimal-preview.png",
  },
] as const;

export const BUSINESS_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  CLOSED: "closed",
} as const;

export const DOMAIN_STATUS = {
  NONE: "none",
  PENDING_DNS: "pending_dns",
  ACTIVE: "active",
} as const;

export const ORDER_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FULFILLED: "fulfilled",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;

export const USER_ROLE = {
  OWNER: "OWNER",
  STAFF: "STAFF",
} as const;
