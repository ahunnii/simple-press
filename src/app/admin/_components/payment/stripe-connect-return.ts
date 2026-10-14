/** Query params the Stripe Connect OAuth callback appends to the return URL. */
export const STRIPE_CONNECT_RETURN_PARAMS = [
  "stripe",
  "stripe_error",
  "stripe_error_description",
] as const;

export type StripeConnectReturnToast = {
  kind: "success" | "info" | "error";
  message: string;
  /** Plain-text detail from Stripe, shown as the toast description. */
  description?: string;
};

type StripeConnectReturnParams = {
  stripe?: string | null;
  stripeError?: string | null;
  stripeErrorDescription?: string | null;
};

const MAX_DESCRIPTION_LENGTH = 200;

/**
 * Maps the callback's query params to the toast the owner should see, or null
 * when the URL carries no Stripe Connect result. Pure so it can be unit-tested.
 */
export function describeStripeConnectReturn({
  stripe,
  stripeError,
  stripeErrorDescription,
}: StripeConnectReturnParams): StripeConnectReturnToast | null {
  if (stripeError) {
    if (stripeError === "access_denied") {
      return { kind: "info", message: "Stripe connection cancelled" };
    }

    if (stripeError === "no_code") {
      return {
        kind: "error",
        message:
          "Stripe didn't send back an authorization, so your account wasn't connected. Please try again.",
      };
    }

    if (stripeError === "connection_failed") {
      return {
        kind: "error",
        message:
          "We couldn't finish connecting your Stripe account. Please try again.",
      };
    }

    // Any other OAuth error code (invalid_scope, server_error, ...). The
    // description comes from the URL, so it is length-capped and only ever
    // rendered as plain text.
    const detail = stripeErrorDescription?.trim();
    return {
      kind: "error",
      message: "Stripe connection failed. Please try again.",
      description:
        detail && detail !== stripeError
          ? detail.slice(0, MAX_DESCRIPTION_LENGTH)
          : undefined,
    };
  }

  if (stripe === "connected") {
    return { kind: "success", message: "Stripe connected" };
  }

  return null;
}
