import { getCallbackUrl } from "~/lib/domain-utils";

type SignedStateResponse = {
  signedState?: string;
};

export async function requestSignedStripeOAuthState(params: {
  businessId: string;
  returnUrl: string;
}): Promise<string> {
  const res = await fetch("/api/stripe/connect/state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error("Failed to generate state");
  }

  const data = (await res.json()) as SignedStateResponse;
  if (!data.signedState) {
    throw new Error("Missing signed state");
  }

  return data.signedState;
}

export function buildStripeConnectAuthorizeUrl(params: {
  clientId: string;
  signedState: string;
}): string {
  const stripeUrl = new URL("https://connect.stripe.com/oauth/authorize");
  stripeUrl.searchParams.set("response_type", "code");
  stripeUrl.searchParams.set("client_id", params.clientId);
  stripeUrl.searchParams.set("scope", "read_write");
  stripeUrl.searchParams.set("redirect_uri", getCallbackUrl());
  stripeUrl.searchParams.set("state", params.signedState);
  return stripeUrl.toString();
}
