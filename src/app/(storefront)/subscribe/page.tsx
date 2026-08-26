import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { parseCardAdditionalFields } from "~/lib/products";
import { isSubscriptionIntervalKey } from "~/lib/subscriptions/intervals";
import {
  computeSubscriptionQuote,
  getSubscriptionOffer,
  SubscriptionPricingError,
} from "~/lib/subscriptions/pricing";
import { api } from "~/trpc/server";

import { SubscribeForm } from "./_components/subscribe-form";

export const metadata = {
  title: "Subscribe",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{
    product?: string;
    variant?: string;
    interval?: string;
    qty?: string;
  }>;
};

function SubscribeUnavailable({ businessName }: { businessName: string }) {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 sm:py-24">
      <div className="border-border bg-card rounded-[var(--radius)] border p-8 text-center sm:p-12">
        <h1 className="text-card-foreground mb-3 text-2xl font-medium tracking-tight">
          Subscriptions aren&apos;t available right now
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
          {businessName} hasn&apos;t finished setting up payments yet. Please
          check back soon, or contact the store directly.
        </p>
      </div>
    </main>
  );
}

/**
 * The Subscribe checkout-prep page. Arrived at only via the `SubscribePanel`
 * CTA on a product page (`/subscribe?product=<slug>&variant=<id>&interval=<key>&qty=<n>`),
 * so every validation failure here means either a stale/hand-edited link or a
 * product an owner reconfigured after the link was generated — both are
 * legitimately 404s. A Stripe-not-connected store is different: it's a real
 * link to a real, subscribable product, just one this store currently can't
 * bill, so it gets a friendly card instead of a 404.
 */
export default async function SubscribePage({ searchParams }: Props) {
  const params = await searchParams;

  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("subscriptions")) notFound();

  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const productSlug = params.product?.trim();
  if (!productSlug) notFound();

  // `product.get` already scopes to `published: true` for this business.
  const product = await api.product.get(productSlug);
  if (!product) notFound();

  const additionalFields = parseCardAdditionalFields(product.additionalFields);
  if (additionalFields.comingSoon) notFound();

  const offer = getSubscriptionOffer(product, params.variant?.trim() ?? null);
  if (!offer.enabled) notFound();

  const intervalParam = params.interval?.trim();
  if (
    !intervalParam ||
    !isSubscriptionIntervalKey(intervalParam) ||
    !offer.intervals.includes(intervalParam)
  ) {
    notFound();
  }
  const intervalKey = intervalParam;

  // Variant resolution mirrors `create-session/route.ts`: a product with
  // variants requires one, and a variant id that doesn't belong to this
  // product (another product's id, a stale link) is rejected the same way.
  const requestedVariantId = params.variant?.trim() ?? "";
  if (product.variants.length > 0 && !requestedVariantId) notFound();
  const variant = requestedVariantId
    ? (product.variants.find((v) => v.id === requestedVariantId) ?? null)
    : null;
  if (requestedVariantId && !variant) notFound();
  const variantId = variant?.id ?? null;

  const qtyParam = params.qty?.trim();
  const parsedQty = qtyParam ? Number.parseInt(qtyParam, 10) : 1;
  const quantity =
    Number.isFinite(parsedQty) && parsedQty >= 1 && parsedQty <= 50
      ? parsedQty
      : 1;

  // Confirms the item total (before shipping) clears Stripe's $0.50 minimum —
  // the same check `create-session` performs, run early so a mispriced
  // product 404s here instead of rendering a form that can never submit.
  try {
    computeSubscriptionQuote({
      listPriceCents: offer.listPriceCents,
      discountPercent: offer.discountPercent,
      quantity,
      shippingCents: 0,
    });
  } catch (err) {
    if (err instanceof SubscriptionPricingError) notFound();
    throw err;
  }

  if (!business.isStripeConnected) {
    return <SubscribeUnavailable businessName={business.name} />;
  }

  // Merchant terms-of-service / refund-policy pages are optional — resolved
  // the same way `checkout/page.tsx` resolves them, so the terms notice only
  // ever links a Page that actually exists.
  const policyPages = await api.content.getSimplifiedPages({ type: "policy" });
  const merchantPolicies = {
    hasTermsOfService: policyPages.some((p) => p.slug === "terms-of-service"),
    hasRefundPolicy: policyPages.some((p) => p.slug === "refund-policy"),
  };

  return (
    <SubscribeForm
      business={business}
      product={product}
      variantId={variantId}
      intervalKey={intervalKey}
      quantity={quantity}
      merchantPolicies={merchantPolicies}
    />
  );
}
