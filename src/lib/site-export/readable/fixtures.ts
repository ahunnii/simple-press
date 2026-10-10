/** Shared test fixtures (not a test file). */
import type { SiteExportBusiness } from "../types";
import type { ProductInput, RenderCtx, PageInput } from "./types";

export const business: SiteExportBusiness = {
  id: "biz1",
  name: "Mug & Co <script>",
  slug: "mug-co",
  templateId: "dream",
  siteUrl: "https://mug.example.com",
  supportEmail: "hi@mug.example.com",
  customDomain: null,
  exportedAt: new Date("2026-10-09T00:00:00Z"),
};

export const mediaMap = new Map<string, string>([
  ["https://cdn.example.com/b/img-1.jpg", "Photos/Products/Blue Mug/01.jpg"],
  ["https://cdn.example.com/b/hero.jpg", "Photos/Pages/hero.jpg"],
]);

export const ctx: RenderCtx = {
  business,
  media: { byUrl: mediaMap },
  timeZone: "America/Detroit",
};

export function product(over: Partial<ProductInput> = {}): ProductInput {
  return {
    name: "Blue Mug",
    slug: "blue-mug",
    excerpt: null,
    description: "A nice mug.\n\nDishwasher safe.",
    price: 1850,
    compareAtPrice: null,
    sku: null,
    trackInventory: false,
    inventoryQty: 0,
    published: true,
    metaTitle: null,
    metaDescription: null,
    metaKeywords: null,
    ogImage: null,
    images: [{ url: "https://cdn.example.com/b/img-1.jpg", alt: "Blue mug" }],
    variants: [],
    collections: [],
    ...over,
  };
}

export function page(over: Partial<PageInput> = {}): PageInput {
  return {
    id: "p1",
    title: "About",
    slug: "about",
    type: "page",
    published: true,
    content: {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hello there" }] },
        { type: "image", attrs: { src: "https://cdn.example.com/b/hero.jpg", alt: "Hero" } },
      ],
    },
    excerpt: null,
    image: null,
    metaTitle: null,
    metaDescription: null,
    metaKeywords: null,
    ogImage: null,
    publishedAt: null,
    createdAt: new Date("2026-01-02T12:00:00Z"),
    ...over,
  };
}
