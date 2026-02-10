"use client";

import { CreditCard, ExternalLink } from "lucide-react";

import { Button } from "~/components/ui/button";

type ConnectStripeButtonProps = {
  businessId: string;
};

export function ConnectStripeButton({ businessId }: ConnectStripeButtonProps) {
  const handleConnect = () => {
    // Construct Stripe Connect OAuth URL
    const clientId = process.env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID;

    if (!clientId) {
      alert("Stripe Connect is not configured. Please contact support.");
      return;
    }

    const redirectUri = `${window.location.origin}/api/stripe/callback`;
    const state = businessId; // Pass business ID for security

    const stripeConnectUrl = `https://connect.stripe.com/oauth/authorize?${new URLSearchParams(
      {
        response_type: "code",
        client_id: clientId,
        scope: "read_write",
        redirect_uri: redirectUri,
        state: state,
      },
    )}`;

    // Redirect to Stripe
    window.location.href = stripeConnectUrl;
  };

  return (
    <Button onClick={handleConnect} className="gap-2">
      <CreditCard className="h-4 w-4" />
      Connect Stripe
      <ExternalLink className="h-4 w-4" />
    </Button>
  );
}
