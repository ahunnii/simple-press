import type { Subscription } from "generated/prisma";

import { getBusinessUrl } from "~/lib/business-url";
import {
  sendOwnerSubscriptionNotification,
  sendSubscriptionCancelled,
  sendSubscriptionPaymentFailed,
  sendSubscriptionStarted,
  sendSubscriptionUpdated,
} from "~/lib/email/templates";

import { getInterval, isSubscriptionIntervalKey } from "./intervals";
import { createSubscriptionToken } from "./token";

/**
 * Thin wrappers over the subscription email helpers in
 * `src/lib/email/templates.ts`.
 *
 * Everything that has to be derived from a `Subscription` row before an email
 * can go out — the signed manage URL, the cadence label, the per-delivery
 * total, the address lines, the idempotency key — lives here exactly once, so
 * the webhook handlers, the customer-facing manage actions and the admin
 * actions can't drift apart on any of it. In particular a customer must never
 * receive a manage link that has expired or points at the wrong tenant: the
 * token is minted fresh on every send from `{ subscriptionId, businessId }`.
 *
 * None of these throw. `sendEmail()` never throws by contract, and callers here
 * are always past the point of no return (money taken, subscription cancelled),
 * so a failed send must never unwind committed state.
 */

/** The business fields every subscription email needs. A wider object is fine. */
export type SubscriptionEmailBusiness = {
  id: string;
  name: string;
  ownerEmail: string;
  subdomain: string;
  customDomain?: string | null;
  domainStatus?: string | null;
  siteContent?: { logoUrl?: string | null } | null;
};

/**
 * The customer-facing self-service URL for a subscription: a signed,
 * 180-day token (`k: "sub"`, carrying both the row id and the business id) on
 * the store's own domain. Minted per send — never stored.
 */
export function buildSubscriptionManageUrl(
  business: SubscriptionEmailBusiness,
  subscription: Pick<Subscription, "id" | "businessId">,
): string {
  const token = createSubscriptionToken({
    subscriptionId: subscription.id,
    businessId: subscription.businessId,
  });
  return `${getBusinessUrl(business)}/subscriptions/${token}`;
}

/** The owner-facing admin URL for a subscription. */
export function buildAdminSubscriptionUrl(
  business: SubscriptionEmailBusiness,
  subscriptionId: string,
): string {
  return `${getBusinessUrl(business)}/admin/subscriptions/${subscriptionId}`;
}

/**
 * Human cadence label ("Every month"). Falls back to the stored
 * `interval`/`intervalCount` pair if the key isn't in the catalog — a row
 * written by an older release must still produce a readable email.
 */
export function subscriptionIntervalLabel(
  subscription: Pick<
    Subscription,
    "intervalKey" | "interval" | "intervalCount"
  >,
): string {
  if (isSubscriptionIntervalKey(subscription.intervalKey)) {
    const entry = getInterval(subscription.intervalKey);
    if (entry) return entry.label;
  }
  return subscription.intervalCount === 1
    ? `Every ${subscription.interval}`
    : `Every ${subscription.intervalCount} ${subscription.interval}s`;
}

/**
 * What the customer is charged per delivery: locked unit price × quantity,
 * plus the locked shipping line when this is a shipped subscription.
 */
export function subscriptionPerDeliveryCents(
  subscription: Pick<
    Subscription,
    "unitAmountCents" | "quantity" | "shippingCents" | "deliveryMethod"
  >,
): number {
  const items = subscription.unitAmountCents * subscription.quantity;
  const shipping =
    subscription.deliveryMethod === "pickup" ? 0 : subscription.shippingCents;
  return items + shipping;
}

/** The locked address snapshot as printable lines, or `undefined` for pickup / no snapshot. */
export function subscriptionAddressLines(
  subscription: Subscription,
): string[] | undefined {
  if (subscription.deliveryMethod === "pickup") return undefined;
  if (!subscription.shipAddress1) return undefined;

  const name = [subscription.shipFirstName, subscription.shipLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const cityLine = [
    subscription.shipCity,
    [subscription.shipProvince, subscription.shipZip].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return [
    name,
    subscription.shipAddress1,
    subscription.shipAddress2 ?? "",
    cityLine,
    subscription.shipCountry ?? "",
  ].filter((line) => line.length > 0);
}

function deliveryMethodOf(subscription: Subscription): "ship" | "pickup" {
  return subscription.deliveryMethod === "pickup" ? "pickup" : "ship";
}

/**
 * "Your subscription is confirmed" to the customer + "New subscription" to the
 * owner. Sent exactly once per subscription, on the transition out of
 * `incomplete` — whichever webhook observes that transition first sends them
 * (`checkout.session.completed` normally, `invoice.paid` when Stripe delivers
 * the two out of order), and the other one then sees a non-incomplete row and
 * stays quiet. The `sub-started-<id>` idempotency key is the backstop.
 */
export async function sendSubscriptionStartedEmails(params: {
  business: SubscriptionEmailBusiness;
  subscription: Subscription;
}): Promise<void> {
  const { business, subscription } = params;
  const intervalLabel = subscriptionIntervalLabel(subscription);
  const perDeliveryCents = subscriptionPerDeliveryCents(subscription);

  await sendSubscriptionStarted({
    to: subscription.customerEmail,
    customerName: subscription.customerName,
    productName: subscription.productName,
    variantName: subscription.variantName,
    quantity: subscription.quantity,
    intervalLabel,
    perDeliveryCents,
    nextBillingAt: subscription.nextBillingAt,
    deliveryMethod: deliveryMethodOf(subscription),
    shippingAddressLines: subscriptionAddressLines(subscription),
    manageUrl: buildSubscriptionManageUrl(business, subscription),
    business,
    idempotencyKey: `sub-started-${subscription.id}`,
  });

  await sendOwnerSubscriptionNotification({
    kind: "new",
    customerEmail: subscription.customerEmail,
    customerName: subscription.customerName,
    productName: subscription.productName,
    variantName: subscription.variantName,
    quantity: subscription.quantity,
    intervalLabel,
    perDeliveryCents,
    adminUrl: buildAdminSubscriptionUrl(business, subscription.id),
    business,
    idempotencyKey: `sub-owner-new-${subscription.id}`,
  });
}

/**
 * "Payment failed, update your card" to the customer, then a heads-up to the
 * owner (who otherwise has no way to know a renewal is failing until they
 * happen to check Stripe or the customer complains).
 *
 * The idempotency key includes Stripe's `attempt_count`: every dunning retry is
 * a genuinely new notification, and reusing one key across attempts would make
 * Resend silently swallow every message after the first. Same rule for the
 * owner send — the store's number of failures matters as much as the fact one
 * happened.
 */
export async function sendSubscriptionPaymentFailedEmail(params: {
  business: SubscriptionEmailBusiness;
  subscription: Subscription;
  invoiceId: string;
  attemptCount: number;
}): Promise<void> {
  const { business, subscription, invoiceId, attemptCount } = params;
  const intervalLabel = subscriptionIntervalLabel(subscription);
  const perDeliveryCents = subscriptionPerDeliveryCents(subscription);

  await sendSubscriptionPaymentFailed({
    to: subscription.customerEmail,
    customerName: subscription.customerName,
    productName: subscription.productName,
    intervalLabel,
    perDeliveryCents,
    manageUrl: buildSubscriptionManageUrl(business, subscription),
    attemptCount,
    business,
    idempotencyKey: `sub-pay-failed-${invoiceId}-${attemptCount}`,
  });

  // Owner heads-up, sent after the customer email — see the docblock above.
  await sendOwnerSubscriptionNotification({
    kind: "payment_failed",
    customerEmail: subscription.customerEmail,
    customerName: subscription.customerName,
    productName: subscription.productName,
    variantName: subscription.variantName,
    quantity: subscription.quantity,
    intervalLabel,
    perDeliveryCents,
    attemptCount,
    adminUrl: buildAdminSubscriptionUrl(business, subscription.id),
    business,
    idempotencyKey: `sub-owner-pay-failed-${invoiceId}-${attemptCount}`,
  });
}

/**
 * "Your subscription has been cancelled" to the customer + a heads-up to the
 * owner. Cancellation is terminal and happens once, so the row id alone is a
 * safe idempotency key.
 */
export async function sendSubscriptionCancelledEmails(params: {
  business: SubscriptionEmailBusiness;
  subscription: Subscription;
  cancelledAt: Date;
}): Promise<void> {
  const { business, subscription, cancelledAt } = params;
  const intervalLabel = subscriptionIntervalLabel(subscription);

  await sendSubscriptionCancelled({
    to: subscription.customerEmail,
    customerName: subscription.customerName,
    productName: subscription.productName,
    variantName: subscription.variantName,
    intervalLabel,
    cancelledAt,
    manageUrl: buildSubscriptionManageUrl(business, subscription),
    business,
    idempotencyKey: `sub-cancelled-${subscription.id}`,
  });

  await sendOwnerSubscriptionNotification({
    kind: "cancelled",
    customerEmail: subscription.customerEmail,
    customerName: subscription.customerName,
    productName: subscription.productName,
    variantName: subscription.variantName,
    quantity: subscription.quantity,
    intervalLabel,
    perDeliveryCents: subscriptionPerDeliveryCents(subscription),
    cancelReason: subscription.cancelReason,
    adminUrl: buildAdminSubscriptionUrl(business, subscription.id),
    business,
    idempotencyKey: `sub-owner-cancelled-${subscription.id}`,
  });
}

/**
 * "Paused" / "Back on" / "Next delivery skipped" to the customer.
 *
 * WHO sends is decided by the row, not by this key: the manage/admin actions
 * and `handleSubscriptionUpdated` each compare-and-set the status they read,
 * and only the side whose write actually moved the row emails. The key is a
 * backstop for one observation of one transition being submitted twice (a
 * redelivered Stripe event), so `transitionKey` must be unique to that
 * observation — the row's `updatedAt` after the action's write, or the Stripe
 * `event.id` — and NEVER something the transition leaves unchanged.
 *
 * It used to be `nextBillingAt`, which pause and resume do not touch, so every
 * pause of a subscription within one billing period reused the same key and
 * Resend (24-hour key memory, `409 invalid_idempotent_request` because the
 * fresh manage token changes the body) silently dropped all but the first.
 */
export async function sendSubscriptionUpdatedEmail(params: {
  business: SubscriptionEmailBusiness;
  subscription: Subscription;
  variant: "paused" | "resumed" | "skipped";
  /** `resumed` only: the customer undid a pending skip rather than lifting a pause. */
  undoSkip?: boolean;
  /** Unique per observed transition — see the docblock. */
  transitionKey: string;
}): Promise<void> {
  const { business, subscription, variant, undoSkip, transitionKey } = params;

  await sendSubscriptionUpdated({
    to: subscription.customerEmail,
    customerName: subscription.customerName,
    productName: subscription.productName,
    variantName: subscription.variantName,
    intervalLabel: subscriptionIntervalLabel(subscription),
    variant,
    undoSkip,
    resumesAt: subscription.pauseResumesAt,
    nextBillingAt: subscription.nextBillingAt,
    manageUrl: buildSubscriptionManageUrl(business, subscription),
    business,
    idempotencyKey: `sub-updated-${subscription.id}-${variant}-${transitionKey}`,
  });
}
