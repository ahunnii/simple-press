// app/admin/settings/_components/stripe-settings.tsx
"use client";

import { useState } from "react";
import {
  CheckCircle,
  CreditCard,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { env } from "~/env";
import { encodeOAuthState, getCallbackUrl } from "~/lib/domain";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

type StripeSettingsProps = {
  businessId: string;
  stripeAccountId: string | null;
};

export function StripeSettings({
  businessId,
  stripeAccountId,
}: StripeSettingsProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleConnect = () => {
    const clientId = process.env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID;

    if (!clientId) {
      toast.error("Stripe not configured");
      return;
    }

    // Get current URL to return to after OAuth
    const returnUrl = window.location.href.split("?")[0]; // Remove query params

    // Encode state
    const state = encodeOAuthState({
      businessId,
      returnUrl: returnUrl ?? "",
    });

    // Build Stripe OAuth URL
    const callbackUrl = getCallbackUrl();
    const stripeUrl = new URL("https://connect.stripe.com/oauth/authorize");
    stripeUrl.searchParams.set("response_type", "code");
    stripeUrl.searchParams.set("client_id", clientId);
    stripeUrl.searchParams.set("scope", "read_write");
    stripeUrl.searchParams.set("redirect_uri", callbackUrl);
    stripeUrl.searchParams.set("state", state);

    // Redirect to Stripe
    window.location.href = stripeUrl.toString();
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect your Stripe account? You won't be able to accept payments until you reconnect.",
      )
    ) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const response = await fetch("/api/stripe/connect/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      toast.success("Stripe account disconnected");
      window.location.reload();
    } catch (error) {
      toast.error("Failed to disconnect Stripe account");
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Stripe Connect
            </CardTitle>
            <CardDescription>
              Accept payments from your customers
            </CardDescription>
          </div>
          {stripeAccountId ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              Not Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stripeAccountId ? (
          <>
            <div>
              <label className="text-sm font-medium">Account ID</label>
              <div className="mt-1 rounded border bg-gray-50 p-3 font-mono text-sm">
                {stripeAccountId}
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Your Stripe account is connected. Payments will be deposited
              directly to your Stripe account.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Dashboard
                  <ExternalLink className="ml-2 h-4 w-4" />
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
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Connect your Stripe account to start accepting payments. Stripe
              handles all payment processing securely.
            </p>
            <Button onClick={handleConnect}>Connect with Stripe</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
