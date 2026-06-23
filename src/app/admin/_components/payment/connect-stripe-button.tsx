"use client";

import { useState } from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

import {
  buildStripeConnectAuthorizeUrl,
  requestSignedStripeOAuthState,
} from "./stripe-connect-utils";

type StripeConnectButtonProps = {
  businessId: string;
  stripeAccountId: string | null;
};

export function ConnectStripeButton({
  businessId,
  stripeAccountId,
}: StripeConnectButtonProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = async () => {
    const clientId = process.env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID;

    if (!clientId) {
      toast.error("Stripe not configured");
      return;
    }

    const returnUrl = window.location.href.split("?")[0] ?? "";

    try {
      const signedState = await requestSignedStripeOAuthState({
        businessId,
        returnUrl,
      });

      window.location.href = buildStripeConnectAuthorizeUrl({
        clientId,
        signedState,
      });
    } catch {
      toast.error("Failed to initiate Stripe connection. Please try again.");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Stripe? You won't be able to accept payments.")) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const response = await fetch("/api/stripe/connect/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) throw new Error("Failed to disconnect");

      toast.success("Stripe disconnected");
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to disconnect",
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (stripeAccountId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        </div>

        <div>
          <label className="text-foreground text-sm font-medium">
            Account ID
          </label>
          <div className="bg-muted mt-1 rounded border p-3 font-mono text-sm">
            {stripeAccountId}
          </div>
        </div>

        <p className="text-muted-foreground text-sm">
          Your Stripe account is connected. Payments are deposited directly to
          your bank.
        </p>

        <div className="flex gap-3">
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Dashboard
            </a>
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              "Disconnect"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <XCircle className="h-3 w-3" />
          Not Connected
        </Badge>
      </div>

      <p className="text-muted-foreground text-sm">
        Connect your Stripe account to start accepting payments.
      </p>

      <Button onClick={handleConnect}>Connect with Stripe</Button>
    </div>
  );
}
