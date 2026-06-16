"use client";

/**
 * TrackPurchase — fires a single Umami `purchase` event when order details
 * become available (i.e. after the Stripe session fetch resolves).
 *
 * Idempotency: uses sessionStorage keyed by `umami:purchase:<sessionId>` so
 * the event is only fired once even if the success page is refreshed.
 * sessionStorage access is wrapped in try/catch because it can throw in
 * privacy-restricted browser modes — this must never crash the UI.
 *
 * Renders null — no DOM output.
 *
 * Props:
 *   sessionId  — the Stripe checkout session ID (used as the idempotency key)
 *   amountCents — order total in cents as returned by Stripe (`amount_total`);
 *                 converted to dollars before being sent to Umami.
 */

import { useEffect } from "react";

import { ANALYTICS_EVENTS, track } from "~/lib/umami/track";

type TrackPurchaseProps = {
  /** Stripe session ID — used as the per-session idempotency key. */
  sessionId: string;
  /** Order total in cents (Stripe `amount_total`). Converted to dollars. */
  amountCents: number;
};

export function TrackPurchase({ sessionId, amountCents }: TrackPurchaseProps) {
  useEffect(() => {
    try {
      const storageKey = `umami:purchase:${sessionId}`;
      if (sessionStorage.getItem(storageKey)) return;

      const valueDollars = amountCents / 100;
      track(ANALYTICS_EVENTS.PURCHASE, {
        sessionId,
        value: valueDollars,
      });

      sessionStorage.setItem(storageKey, "1");
    } catch {
      // sessionStorage may be unavailable in strict privacy modes; also guards
      // any unexpected runtime error — never throw into the parent component.
    }
    // Fire when sessionId or amountCents change (in practice, once on load).
  }, [sessionId, amountCents]);

  return null;
}
