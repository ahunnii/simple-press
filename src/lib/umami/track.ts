/**
 * Client-safe Umami custom event tracking helper.
 *
 * Guards against:
 * - SSR (typeof window === "undefined")
 * - window.umami not yet loaded or blocked by an ad-blocker
 * - Any unexpected runtime error (try/catch so it can never throw into UI code)
 *
 * Usage:
 *   import { track, ANALYTICS_EVENTS } from "~/lib/umami/track";
 *   track(ANALYTICS_EVENTS.ADD_TO_CART, { productId: "abc", name: "Widget" });
 */

/** Well-known commerce event names — use these to avoid typos. */
export const ANALYTICS_EVENTS = {
  ADD_TO_CART: "add-to-cart",
  BEGIN_CHECKOUT: "begin-checkout",
  PRODUCT_VIEW: "product-view",
  /** Fired once per Stripe session when the order success page is reached. */
  PURCHASE: "purchase",
  /** Fired when a visitor clicks into a third-party embedded iframe. */
  EMBED_ENGAGED: "embed-engaged",
  /**
   * Fired when the visitor clicks back out of an embed.
   * The `seconds` property is approximate — window blur/focus also fires when
   * switching browser tabs, so this value can over-count.
   */
  EMBED_ENGAGED_TIME: "embed-engaged-time",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Fire a custom Umami event.
 *
 * @param event - Event name (use ANALYTICS_EVENTS constants)
 * @param data  - Optional structured data attached to the event
 */
export function track(
  event: string,
  data?: Record<string, string | number | boolean>,
): void {
  try {
    if (typeof window === "undefined") return;
    if (!window.umami) return;
    window.umami.track(event, data);
  } catch {
    // Never throw into UI code — silently swallow any error
  }
}
