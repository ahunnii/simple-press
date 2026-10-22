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
  WEALTH: "wealth",
  OLIVE: "olive",
  DREAM: "dream",
  UMSC: "umsc",
  GLOVE: "glove",
} as const;

export const TEMPLATES = [
  {
    id: TEMPLATE_IDS.DEFAULT,
    name: "Default",
    description:
      "Simple, versatile storefront that works for any kind of shop — a solid starting point you can customize as you grow",
    previewImage: "/templates/default-preview.png",
    emailDefaults: {
      accent: "#111827",
      pageBackground: "#f6f9fc",
      font: "sans",
    },
  },
  {
    id: TEMPLATE_IDS.MODERN,
    name: "Modern",
    description:
      "Clean and contemporary design perfect for fashion, tech, or lifestyle brands",
    previewImage: "/templates/modern-preview.png",
    emailDefaults: {
      accent: "#111827",
      pageBackground: "#f6f9fc",
      font: "sans",
    },
  },
  {
    id: TEMPLATE_IDS.BAMBOO,
    name: "Bamboo",
    description:
      "Luxe editorial storefront for eco brands — deep forest green and antique gold on warm cream, serif display type, and an emblem-first navigation that puts the brand's logo center stage",
    previewImage: "/templates/bamboo-preview.png",
    emailDefaults: {
      accent: "#1b412a",
      pageBackground: "#f4f0e1",
      font: "serif",
    },
  },
  {
    id: TEMPLATE_IDS.ANIMATED_BAMBOO,
    name: "Animated Bamboo",
    description:
      "Illustrated, animation-forward take on the Bamboo storefront — living scenes, scroll reveals, and hand-drawn artwork throughout.",
    previewImage: "/templates/animated-bamboo-preview.png",
    emailDefaults: {
      accent: "#2c5234",
      pageBackground: "#fbf9f2",
      font: "sans",
    },
  },
  {
    id: TEMPLATE_IDS.HAPPY_BAMBOO,
    name: "Happy Bamboo",
    description:
      "Lush nature-focused shop with coming-soon product support, botanical imagery, and rich per-product feature highlights",
    previewImage: "/templates/happy-bamboo-preview.png",
    emailDefaults: {
      accent: "#4c6d00",
      pageBackground: "#f6f9fc",
      font: "serif",
    },
  },
  {
    id: TEMPLATE_IDS.DARK_TREND,
    name: "Dark Trend",
    description:
      "Dark and bold design perfect for tech, gaming, or lifestyle brands",
    previewImage: "/templates/dark-trend-preview.png",
    emailDefaults: {
      accent: "#7f22fe",
      pageBackground: "#f6f9fc",
      font: "sans",
    },
  },
  {
    id: TEMPLATE_IDS.ELEGANT,
    name: "Elegant",
    description:
      "Clean botanical beauty and wellness storefront with organic certification badges and soft, nature-derived styling",
    previewImage: "/templates/elegant-preview.png",
    emailDefaults: {
      accent: "#0b0907",
      pageBackground: "#f9f2e6",
      font: "serif",
    },
  },
  {
    id: TEMPLATE_IDS.POLLEN,
    name: "Pollen",
    description:
      "Bright and colorful design oriented toward environmental brands and causes; products and shop are supported but not the focus",
    previewImage: "/templates/pollen-preview.png",
    emailDefaults: {
      accent: "#215935",
      pageBackground: "#f6f9fc",
      font: "sans",
    },
  },
  {
    id: TEMPLATE_IDS.NOISE,
    name: "Noise",
    description:
      "Editorial luxury fashion (Visual Noise Detroit) — Cormorant Garamond serif headings, steel blue–champagne palette, split-hero layout",
    previewImage: "/templates/noise-preview.png",
    emailDefaults: {
      accent: "#1a1a1a",
      pageBackground: "#fbfaf7",
      font: "serif",
    },
  },
  {
    id: TEMPLATE_IDS.SLEDGE,
    name: "Sledge",
    description:
      "Bold cream-and-green streetwear / lifestyle storefront with a mosaic hero, wave dividers, and testimonials carousel",
    previewImage: "/templates/sledge-preview.png",
    emailDefaults: {
      accent: "#c2410c",
      pageBackground: "#f6f9fc",
      font: "sans",
    },
  },
  {
    id: TEMPLATE_IDS.VII,
    name: "VII",
    description:
      "Full-featured boutique with a services section, rich branding fields, announcement bar, and shop — ideal for luxury or creative studios",
    previewImage: "/templates/vii-preview.png",
    emailDefaults: {
      accent: "#1e3540",
      pageBackground: "#ede3ce",
      font: "serif",
    },
  },
  {
    id: TEMPLATE_IDS.BUILDERS,
    name: "Builders",
    description:
      "Industrial Solidarity service/portfolio template for trades and construction businesses — no shop or checkout; highlights services, about, and contact",
    previewImage: "/templates/builders-preview.png",
    emailDefaults: {
      accent: "#ffc5b6",
      pageBackground: "#f6f9fc",
      font: "sans",
    },
  },
  {
    id: TEMPLATE_IDS.COOP,
    name: "Coop",
    description:
      "Pixel-exact replica of buildingcooperatively.com — minimal 4-page service site with a parallax hero and project photo gallery (no shop or checkout)",
    previewImage: "/templates/coop-preview.png",
    emailDefaults: {
      accent: "#262626",
      pageBackground: "#f6f9fc",
      font: "sans",
    },
  },
  {
    id: TEMPLATE_IDS.PINK,
    name: "PinkArt",
    description:
      "Editorial gallery storefront for makers — near-black chrome against warm paper, square edges and hairline grids; full commerce plus workshops, journal and keeper stories",
    previewImage: "/templates/pink-preview.png",
    emailDefaults: {
      accent: "#d81b60",
      pageBackground: "#f6f9fc",
      font: "serif",
    },
  },
  {
    id: TEMPLATE_IDS.RELOCATION,
    name: "Handy Relocations",
    description:
      "1:1 recreation of handyrelocations.com — terracotta wave heroes, quote form, reviews, and FAQ for a Detroit moving company (no shop or checkout)",
    previewImage: "/templates/relocation-preview.png",
    emailDefaults: {
      accent: "#a5513a",
      pageBackground: "#f6f9fc",
      font: "sans",
    },
  },
  {
    id: TEMPLATE_IDS.WEALTH,
    name: "Wealth",
    description:
      "1:1 recreation of detroitcommunitywealth.org — quiet sage-and-paper nonprofit site with overlap heroes, programs, donate, and co-op directory (no shop or checkout)",
    previewImage: "/templates/wealth-preview.png",
    emailDefaults: {
      accent: "#376d39",
      pageBackground: "#f6f9fc",
      font: "sans",
    },
  },
  {
    id: TEMPLATE_IDS.DREAM,
    name: "Dream Your Theme",
    description:
      "Dreamy event-decor site — logo hero with drifting clouds, alternating service rows, masonry gallery, and an Estimate Quote request (no shop or checkout)",
    previewImage: "/templates/dream-preview.png",
    emailDefaults: {
      accent: "#2b211d",
      pageBackground: "#fffaf4",
      font: "serif",
    },
  },
  {
    id: TEMPLATE_IDS.UMSC,
    name: "Unique Monique",
    description:
      "Calm candle-bar storefront — black/gold header, full-height video-or-photo hero with a thin serif headline, cream product shop (candles, soaps, body care, home care), custom-order request",
    previewImage: "/templates/umsc-preview.png",
    emailDefaults: {
      accent: "#050505",
      pageBackground: "#fffaf2",
      font: "serif",
    },
  },
  {
    id: TEMPLATE_IDS.OLIVE,
    name: "Olive Mode",
    description:
      "Detroit women's boutique (Olive Mode) — white swatch-book cards, photo-led grids, sage-green cover footer, Josefin Sans + Figtree",
    previewImage: "/templates/olive-preview.png",
    emailDefaults: {
      accent: "#1f1b17",
      pageBackground: "#f7f4ed",
      font: "serif",
    },
  },
  {
    id: TEMPLATE_IDS.GLOVE,
    name: "The LuvGluv",
    description:
      "Royal-purple luxury glove boutique (The LuvGluv) — search-first Woo-style header, lavender story band, 6-step customization guide, charm add-on picker on the product page, Poppins + Lato",
    previewImage: "/templates/glove-preview.png",
    emailDefaults: {
      accent: "#601b76",
      pageBackground: "#f6f9fc",
      font: "sans",
    },
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
