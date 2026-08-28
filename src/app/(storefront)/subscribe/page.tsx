import Link from "next/link";
import { notFound } from "next/navigation";

import type {
  PoolAvailability,
  ProductAvailability,
  VariantAvailability,
} from "~/lib/checkout/types";
import {
  checkCartAvailability,
  computePoolDemand,
} from "~/lib/checkout/validate-cart";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { parseCardAdditionalFields } from "~/lib/products";
import { isSubscriptionIntervalKey } from "~/lib/subscriptions/intervals";
import {
  computeSubscriptionQuote,
  getSubscriptionOffer,
  SubscriptionPricingError,
} from "~/lib/subscriptions/pricing";
import { getSession } from "~/server/better-auth/server";
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
 * Shown when the product/variant this link points at is genuinely out of
 * stock — checked with the same `checkCartAvailability` helper the checkout
 * route uses, so a shopper can never fill out the whole form only to have
 * `create-session` reject it with "This item is out of stock". Owner-fault
 * unavailability reasons (unpublished, coming-soon, deleted variant, missing
 * pool) still 404 above — this card is only for ordinary scarcity.
 */
function SubscribeUnavailableStock({
  productName,
  productSlug,
}: {
  productName: string;
  productSlug: string;
}) {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 sm:py-24">
      <div className="border-border bg-card rounded-[var(--radius)] border p-8 text-center sm:p-12">
        <h1 className="text-card-foreground mb-3 text-2xl font-medium tracking-tight">
          Currently out of stock
        </h1>
        <p className="text-muted-foreground mx-auto max-w-md text-sm leading-relaxed">
          {productName} can&apos;t be subscribed to right now. Check back soon.
        </p>
        <Link
          href={`/shop/${productSlug}`}
          className="text-primary mt-6 inline-block text-sm font-medium underline underline-offset-2"
        >
          Back to product
        </Link>
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

  // Stock check — same `checkCartAvailability` helper the checkout route
  // uses (see `create-session/route.ts` ~308-403), run here so a sold-out
  // product renders a friendly card instead of a form that can only fail at
  // submit. Built from the `product.get` payload already fetched above
  // rather than a second query; `baseInventoryUnit.reservedQty` isn't
  // selected by that procedure, so shared-pool stock is treated
  // conservatively (reservedQty: 0) — the same tradeoff `getCartItemsStatus`
  // in `product.ts` already makes.
  const availabilityLine = {
    productId: product.id,
    variantId,
    productName: product.name,
    variantName: variant?.name ?? null,
    quantity,
  };
  const availabilityVariantMap = new Map<string, VariantAvailability>(
    variant
      ? [
          [
            variant.id,
            {
              price: variant.price,
              inventoryQty: variant.inventoryQty,
              reservedQty: variant.reservedQty,
              product: {
                price: product.price,
                published: product.published,
                trackInventory: product.trackInventory,
                allowBackorders: product.allowBackorders,
                additionalFields: product.additionalFields,
              },
            },
          ],
        ]
      : [],
  );
  const availabilityProductMap = new Map<string, ProductAvailability>([
    [
      product.id,
      {
        price: product.price,
        published: product.published,
        trackInventory: product.trackInventory,
        allowBackorders: product.allowBackorders,
        inventoryQty: product.inventoryQty,
        reservedQty: product.reservedQty,
        additionalFields: product.additionalFields,
        baseInventoryUnitId: product.baseInventoryUnitId,
        baseUnitsConsumed: product.baseUnitsConsumed,
        _count: { variants: product.variants.length },
      },
    ],
  ]);
  const availabilityPoolDemand = computePoolDemand(
    [availabilityLine],
    availabilityProductMap,
  );
  const availabilityPoolMap = new Map<string, PoolAvailability>(
    product.baseInventoryUnitId && product.baseInventoryUnit
      ? [
          [
            product.baseInventoryUnitId,
            {
              inventoryQty: product.baseInventoryUnit.inventoryQty,
              reservedQty: 0,
              allowBackorders: product.baseInventoryUnit.allowBackorders,
            },
          ],
        ]
      : [],
  );
  const { unavailableDetails } = checkCartAvailability({
    items: [availabilityLine],
    variantMap: availabilityVariantMap,
    productMap: availabilityProductMap,
    poolDemand: availabilityPoolDemand,
    poolMap: availabilityPoolMap,
  });
  if (unavailableDetails.length > 0) {
    // Plain scarcity (including an exhausted shared pool) is the one
    // shopper-visible reason — everything else (unpublished, coming-soon, a
    // deleted variant/pool) means this link is stale or the catalog changed
    // out from under it, which is the same 404 every other validation
    // failure on this page produces.
    const reason = unavailableDetails[0]?.reason ?? "out-of-stock";
    if (reason !== "out-of-stock") notFound();
    return (
      <SubscribeUnavailableStock
        productName={product.name}
        productSlug={product.slug}
      />
    );
  }

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

  // Pre-fills the email field for a signed-in shopper — never required, a
  // guest can still fill it in and subscribe.
  const session = await getSession();

  return (
    <SubscribeForm
      business={business}
      product={product}
      variantId={variantId}
      intervalKey={intervalKey}
      quantity={quantity}
      merchantPolicies={merchantPolicies}
      initialEmail={session?.user.email ?? ""}
    />
  );
}
