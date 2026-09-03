export const TEMPLATE_IDS = {
  DEFAULT: "default",
  MODERN: "modern",
  BAMBOO: "bamboo",
  ANIMATED_BAMBOO: "animated-bamboo",
  HAPPY_BAMBOO: "happy-bamboo",
  DARK_TREND: "dark-trend",
  ELEGANT: "elegant",
  POLLEN: "pollen",
  NOISE: "noise",
  SLEDGE: "sledge",
  VII: "vii",
  BUILDERS: "builders",
  COOP: "coop",
  PINK: "pink",
  RELOCATION: "relocation",
} as const;

export const TEMPLATES = [
  {
    id: TEMPLATE_IDS.DEFAULT,
    name: "Default",
    description:
      "Simple, versatile storefront that works for any kind of shop — a solid starting point you can customize as you grow",
    previewImage: "/templates/default-preview.png",
  },
  {
    id: TEMPLATE_IDS.MODERN,
    name: "Modern",
    description:
      "Clean and contemporary design perfect for fashion, tech, or lifestyle brands",
    previewImage: "/templates/modern-preview.png",
  },
  {
    id: TEMPLATE_IDS.BAMBOO,
    name: "Bamboo",
    description:
      "Warm illustrated storefront where the brand's own artwork comes alive — ambient motion, torn-paper edges, and hand-drawn product scenes for eco-friendly brands",
    previewImage: "/templates/bamboo-preview.png",
  },
  {
    id: TEMPLATE_IDS.ANIMATED_BAMBOO,
    name: "Animated Bamboo",
    description:
      "Illustrated, animation-forward take on the Bamboo storefront — living scenes, scroll reveals, and hand-drawn artwork throughout.",
    previewImage: "/templates/animated-bamboo-preview.png",
  },
  {
    id: TEMPLATE_IDS.HAPPY_BAMBOO,
    name: "Happy Bamboo",
    description:
      "Lush nature-focused shop with coming-soon product support, botanical imagery, and rich per-product feature highlights",
    previewImage: "/templates/happy-bamboo-preview.png",
  },
  {
    id: TEMPLATE_IDS.DARK_TREND,
    name: "Dark Trend",
    description:
      "Dark and bold design perfect for tech, gaming, or lifestyle brands",
    previewImage: "/templates/dark-trend-preview.png",
  },
  {
    id: TEMPLATE_IDS.ELEGANT,
    name: "Elegant",
    description:
      "Clean botanical beauty and wellness storefront with organic certification badges and soft, nature-derived styling",
    previewImage: "/templates/elegant-preview.png",
  },
  {
    id: TEMPLATE_IDS.POLLEN,
    name: "Pollen",
    description:
      "Bright and colorful design oriented toward environmental brands and causes; products and shop are supported but not the focus",
    previewImage: "/templates/pollen-preview.png",
  },
  {
    id: TEMPLATE_IDS.NOISE,
    name: "Noise",
    description:
      "Editorial luxury fashion (Visual Noise Detroit) — Cormorant Garamond serif headings, steel blue–champagne palette, split-hero layout",
    previewImage: "/templates/noise-preview.png",
  },
  {
    id: TEMPLATE_IDS.SLEDGE,
    name: "Sledge",
    description:
      "Bold cream-and-green streetwear / lifestyle storefront with a mosaic hero, wave dividers, and testimonials carousel",
    previewImage: "/templates/sledge-preview.png",
  },
  {
    id: TEMPLATE_IDS.VII,
    name: "VII",
    description:
      "Full-featured boutique with a services section, rich branding fields, announcement bar, and shop — ideal for luxury or creative studios",
    previewImage: "/templates/vii-preview.png",
  },
  {
    id: TEMPLATE_IDS.BUILDERS,
    name: "Builders",
    description:
      "Industrial Solidarity service/portfolio template for trades and construction businesses — no shop or checkout; highlights services, about, and contact",
    previewImage: "/templates/builders-preview.png",
  },
  {
    id: TEMPLATE_IDS.COOP,
    name: "Coop",
    description:
      "Pixel-exact replica of buildingcooperatively.com — minimal 4-page service site with a parallax hero and project photo gallery (no shop or checkout)",
    previewImage: "/templates/coop-preview.png",
  },
  {
    id: TEMPLATE_IDS.PINK,
    name: "PinkArt",
    description:
      "Editorial gallery storefront for makers — near-black chrome against warm paper, square edges and hairline grids; full commerce plus workshops, journal and keeper stories",
    previewImage: "/templates/pink-preview.png",
  },
  {
    id: TEMPLATE_IDS.RELOCATION,
    name: "Handy Relocations",
    description:
      "1:1 recreation of handyrelocations.com — terracotta wave heroes, quote form, reviews, and FAQ for a Detroit moving company (no shop or checkout)",
    previewImage: "/templates/relocation-preview.png",
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
