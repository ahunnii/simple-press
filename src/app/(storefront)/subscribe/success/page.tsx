import type { Subscription } from "generated/prisma";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";
import { formatPrice } from "~/lib/prices";
import {
  buildSubscriptionManageUrl,
  subscriptionAddressLines,
  subscriptionIntervalLabel,
  subscriptionPerDeliveryCents,
} from "~/lib/subscriptions/emails";
import { db } from "~/server/db";

export const metadata = {
  title: "Subscribed",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Generic "thanks" card — shown whenever the visitor is not verifiably the
 * one who started this checkout (missing/mismatched cookie, no matching row,
 * a cancelled subscription). Never 403s and never hints at *why* the details
 * aren't shown: this is a customer-facing success page, not a security
 * boundary error, and Stripe can legitimately still be mid-webhook when
 * someone lands here.
 */
function GenericThanksCard() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 sm:py-24">
      <div className="border-border bg-card rounded-[var(--radius)] border p-8 text-center sm:p-12">
        <h1 className="text-card-foreground mb-3 text-2xl font-medium tracking-tight">
          Thanks!
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
          Check your email for your subscription details.
        </p>
      </div>
    </main>
  );
}

function ConfirmingCard() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 sm:py-24">
      <div className="border-border bg-card rounded-[var(--radius)] border p-8 text-center sm:p-12">
        <h1 className="text-card-foreground mb-3 text-2xl font-medium tracking-tight">
          Confirming your subscription…
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
          Your payment is being processed. A confirmation email is on its way —
          it can take a minute or two to arrive.
        </p>
      </div>
    </main>
  );
}

/**
 * `success_url` destination from `createSubscriptionCheckoutSession`. Reads
 * only the local `Subscription` row and the `pending_subscription_session`
 * cookie set by the create-session route — it never calls Stripe, so it can
 * never race the webhook by asking Stripe a question the webhook hasn't
 * answered yet.
 */
export default async function SubscribeSuccessPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams;

  const business = await checkBusiness();
  if (!business) notFound();

  const cookieStore = await cookies();
  const pendingSessionId = cookieStore.get(
    "pending_subscription_session",
  )?.value;

  const verified =
    !!sessionId && !!pendingSessionId && sessionId === pendingSessionId;

  const subscription: Subscription | null = verified
    ? await db.subscription.findFirst({
        where: { stripeCheckoutSessionId: sessionId, businessId: business.id },
      })
    : null;

  if (!subscription || subscription.status === "cancelled") {
    return <GenericThanksCard />;
  }

  if (subscription.status === "incomplete") {
    return <ConfirmingCard />;
  }

  const fullBusiness = await db.business.findUnique({
    where: { id: business.id },
    select: {
      id: true,
      name: true,
      ownerEmail: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
      siteContent: { select: { logoUrl: true } },
    },
  });
  // Extremely defensive: the row we just loaded proves the business exists.
  if (!fullBusiness) return <GenericThanksCard />;

  const manageUrl = buildSubscriptionManageUrl(fullBusiness, subscription);
  const intervalLabel = subscriptionIntervalLabel(subscription);
  const perDeliveryCents = subscriptionPerDeliveryCents(subscription);
  const addressLines = subscriptionAddressLines(subscription);

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 sm:py-24">
      <div className="border-border bg-card rounded-[var(--radius)] border p-8 text-center sm:p-12">
        <h1 className="text-card-foreground mb-3 text-2xl font-medium tracking-tight">
          You&apos;re subscribed!
        </h1>
        <p className="text-muted-foreground mx-auto mb-6 max-w-md text-sm leading-relaxed">
          Thanks for subscribing to {fullBusiness.name}. A confirmation email is
          on its way.
        </p>

        <dl className="mx-auto flex max-w-sm flex-col gap-2 text-left text-sm">
          <div className="border-border flex justify-between gap-4 border-b pb-2">
            <dt className="text-muted-foreground">Subscription</dt>
            <dd className="text-right font-medium">
              {subscription.productName}
              {subscription.variantName ? ` — ${subscription.variantName}` : ""}
            </dd>
          </div>
          <div className="border-border flex justify-between border-b pb-2">
            <dt className="text-muted-foreground">Quantity</dt>
            <dd>{subscription.quantity}</dd>
          </div>
          <div className="border-border flex justify-between border-b pb-2">
            <dt className="text-muted-foreground">Delivery frequency</dt>
            <dd>{intervalLabel}</dd>
          </div>
          <div className="border-border flex justify-between border-b pb-2">
            <dt className="text-muted-foreground">Per delivery</dt>
            <dd>{formatPrice(perDeliveryCents)}</dd>
          </div>
          {subscription.nextBillingAt && (
            <div className="border-border flex justify-between border-b pb-2">
              <dt className="text-muted-foreground">Next delivery</dt>
              <dd>{formatDateOnly(subscription.nextBillingAt)}</dd>
            </div>
          )}
          {addressLines && addressLines.length > 0 && (
            <div className="flex flex-col gap-0.5 pt-1">
              <dt className="text-muted-foreground">Shipping to</dt>
              <dd>
                {addressLines.map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>

        <a
          href={manageUrl}
          className="bg-primary text-primary-foreground focus-visible:ring-ring mt-8 inline-flex items-center justify-center rounded-[var(--radius)] px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Manage your subscription
        </a>
      </div>
    </main>
  );
}
