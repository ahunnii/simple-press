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

/**
 * A rate limit tripped on the way to loading this page.
 *
 * `getByToken` no longer consumes the manage limiter (only the mutations do —
 * see `consumeManageLimiter` in the router), so today this is a safety net
 * rather than a routine path. It exists because the failure it catches is
 * expensive: `TOO_MANY_REQUESTS` reaching the error boundary tells a customer
 * their store is broken, on the one page that lets them cancel. Same card
 * shape as `ExpiredState`, with a way back to the lookup form.
 */
function RateLimitedState() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-24">
      <div className="border-border rounded-[var(--radius)] border p-8 text-center sm:p-12">
        <h1 className="mb-3 text-2xl font-medium tracking-tight">
          Too many requests
        </h1>
        <p className="text-muted-foreground mx-auto mb-8 max-w-md text-sm leading-relaxed">
          Please wait a few minutes and reload this page. Your subscription
          hasn&apos;t changed.
        </p>
        <Link
          href="/subscriptions/manage"
          className="inline-flex items-center gap-2 border-b border-current pb-0.5 text-sm font-medium transition-[gap] hover:gap-3"
        >
          Look up your subscription <span aria-hidden="true">→</span>
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
 * - `TOO_MANY_REQUESTS` → a "wait a few minutes" card, not the error
 *   boundary: a throttle is not a crash, and this page is the customer's
 *   route to cancelling.
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
    .catch((error: unknown) => {
      if (error instanceof TRPCError) {
        if (error.code === "NOT_FOUND") notFound();
        // Not a crash — a throttle. Rendering the boundary here would tell a
        // customer their store is broken on the one page they use to cancel.
        if (error.code === "TOO_MANY_REQUESTS") return null;
      }
      return rethrowTrpcForErrorBoundary(error);
    });

  if (!subscription) return <RateLimitedState />;

  return (
    <SubscriptionManageClient
      token={token}
      subscription={subscription}
      actionsEnabled={actionsEnabled}
      businessName={business.name}
    />
  );
}
