"use client";

import { useStorefrontFlags } from "~/providers/feature-flags-context";

/**
 * Whether the storefront may offer a buy path: the `cart` flag ("Shopping
 * Cart & Checkout") after dependency resolution (`cart` depends on
 * `products`). Off = catalog mode (feature-baseline B6.11): `/cart` and
 * `/checkout` 404, so every Add to Cart / quick-add button, quantity stepper,
 * add-on picker, header cart icon / bag button and cart-drawer trigger must
 * be hidden — never rendered as a dead button. Price, variants, wishlist,
 * stock/NotifyMe and share stay.
 *
 * Reads `StorefrontFlagsProvider`, which the storefront layout seeds from the
 * server, so the SSR HTML and the first client render agree (no flash).
 */
export function useCartEnabled(): boolean {
  return useStorefrontFlags().isEnabled("cart");
}
