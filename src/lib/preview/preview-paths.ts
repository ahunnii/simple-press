/** Map editor page tab keys to storefront paths for the preview iframe. */
export const PAGE_PREVIEW_PATHS: Record<string, string> = {
  homepage: "/",
  about: "/about",
  blog: "/blog",
  contact: "/contact",
  collections: "/collections",
  testimonials: "/testimonials",
  // The "products" tab edits the shop/product-listing page, served at /shop.
  products: "/shop",
  // happy-bamboo groups its shop listing fields under a "shop" page key.
  shop: "/shop",
  services: "/services",
  events: "/events",
  // "cart" and "checkout" field pages are intentionally absent: the preview
  // iframe's cart is empty (localStorage), so those pages preview an
  // unrepresentative state. Their fields remain editable in the advanced
  // template editor (platform admin).
};

export type PreviewPage = keyof typeof PAGE_PREVIEW_PATHS;
