/**
 * Default (no owner override) subject lines for the transactional emails
 * whose real subject depends on the send's data — pickup vs. ship, the
 * product name, the subscription action.
 *
 * ONE source of truth: the senders in `templates.ts` and the admin email
 * preview (`/admin/emails`) both call these, so the preview can never show a
 * subject the send path doesn't produce. Pure and dependency-free — this
 * module is imported from client code, so keep server-only imports out.
 *
 * The static `defaultSubject` patterns in `CUSTOMIZABLE_EMAILS` remain the
 * fallback for emails whose subject doesn't vary.
 */

export function orderConfirmationDefaultSubject(params: {
  orderNumber: number | string;
  isPickup: boolean;
}): string {
  return params.isPickup
    ? `Order #${params.orderNumber} confirmed — pickup details inside`
    : `Order #${params.orderNumber} Confirmed`;
}

export function subscriptionStartedDefaultSubject(params: {
  productName: string;
}): string {
  return `Your ${params.productName} subscription is confirmed`;
}

export function subscriptionPaymentFailedDefaultSubject(params: {
  productName: string;
}): string {
  return `Action needed: payment for your ${params.productName} subscription`;
}

export function subscriptionCancelledDefaultSubject(params: {
  productName: string;
}): string {
  return `Your ${params.productName} subscription has been cancelled`;
}

export function subscriptionUpdatedDefaultSubject(params: {
  variant: "paused" | "resumed" | "skipped";
  /** `resumed` only: the customer undid a pending skip rather than lifting a pause. */
  undoSkip?: boolean;
}): string {
  if (params.variant === "paused") return "Your subscription is paused";
  if (params.variant === "resumed") {
    return params.undoSkip
      ? "Your next delivery is back on"
      : "Your subscription is back on";
  }
  return "Your next delivery is skipped";
}

export function orderPaymentProcessingDefaultSubject(params: {
  businessName: string;
}): string {
  return `Your order at ${params.businessName} is processing`;
}

export function orderPaymentFailedDefaultSubject(params: {
  businessName: string;
}): string {
  return `Your payment to ${params.businessName} didn't go through`;
}

export function orderPaymentFailedOwnerDefaultSubject(params: {
  customerName?: string | null;
  customerEmail: string;
  businessName: string;
}): string {
  const trimmedName = params.customerName?.trim();
  const who =
    trimmedName && trimmedName.length > 0 ? trimmedName : params.customerEmail;
  return `Bank payment failed — ${who} at ${params.businessName}`;
}
