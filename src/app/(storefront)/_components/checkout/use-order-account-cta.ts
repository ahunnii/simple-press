"use client";

import type { Session } from "~/server/better-auth/config";
import { useHydratedSession } from "~/lib/auth/use-hydrated-session";
import { useStorefrontFlags } from "~/providers/feature-flags-context";

export type OrderAccountCta = { href: string; label: string };

/**
 * B9.4 — the account next step on an order confirmation (P-ORDER-CTA).
 * Signed in + `orders` on → the orders list; signed out + `customerAccounts`
 * on → sign-up; otherwise nothing. Returns null while the session is pending
 * so the CTA never flashes the wrong branch. Templates only style the result.
 */
export function useOrderAccountCta(
  initialSession?: Session | null,
): OrderAccountCta | null {
  const { data: session, isPending } = useHydratedSession(initialSession);
  const { isEnabled } = useStorefrontFlags();

  if (isPending) {
    return null;
  }

  if (session?.user) {
    return isEnabled("orders")
      ? { href: "/account/orders", label: "View my orders" }
      : null;
  }

  return isEnabled("customerAccounts")
    ? { href: "/auth/sign-up", label: "Create an account" }
    : null;
}
