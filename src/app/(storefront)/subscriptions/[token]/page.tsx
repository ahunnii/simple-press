import Link from "next/link";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { checkBusiness } from "~/lib/check-business";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { verifySubscriptionToken } from "~/lib/subscriptions/token";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { SubscriptionManageClient } from "../_components/subscription-manage-client";

export const metadata = {
  title: "Manage subscription",
  robots: { index: false, follow: false },
};

function ExpiredState() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-24">
      <div className="border-border rounded-[var(--radius)] border p-8 text-center sm:p-12">
        <h1 className="mb-3 text-2xl font-medium tracking-tight">
          This link has expired
        </h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-md text-sm leading-relaxed">
          Subscription manage links expire after a while for your security.
          Request a new one and we&apos;ll email it to the address on your
          subscription.
        </p>
        <Link
          href="/subscriptions/manage"
          className="inline-flex items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
        >
          Request a new link <span aria-hidden="true">→</span>
        </Link>
      </div>
    </main>
  );
}

type Props = {
  params: Promise<{ token: string }>;
};

/**
 * The signed-magic-link subscription manage page (plan §5). Every check
 * here mirrors `order-status/[token]/page.tsx`'s security shape:
 *
 * - No `checkBusiness()` match → 404 (never leak that any tenant exists).
 * - Token doesn't verify (tampered/garbage) or has expired → a friendly
 *   recovery card, NOT a 404 — the customer typed a real (stale) link.
 * - Token verifies but names a different business than the one this host
 *   resolves to → 404 (cross-tenant tokens must not probe anything).
 * - `subscription.getByToken` re-derives and re-checks all of the above
 *   itself (`loadByToken` in the router) before returning data, so a
 *   `NOT_FOUND` from that call — the row was deleted, or something this
 *   page's own checks didn't already catch — also 404s rather than crashing.
 */
export default async function SubscriptionManagePage({ params }: Props) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);

  const business = await checkBusiness();
  if (!business) notFound();

  const payload = verifySubscriptionToken(token);
  if (!payload) {
    return <ExpiredState />;
  }
  if (payload.businessId !== business.id) notFound();

  const { isEnabled } = await getBusinessFlags();
  const actionsEnabled = isEnabled("subscriptions");

  const subscription = await api.subscription
    .getByToken({ token })
    .catch((error: unknown): never => {
      if (error instanceof TRPCError && error.code === "NOT_FOUND") {
        notFound();
      }
      return rethrowTrpcForErrorBoundary(error);
    });

  return (
    <SubscriptionManageClient
      token={token}
      subscription={subscription}
      actionsEnabled={actionsEnabled}
      businessName={business.name}
    />
  );
}
