"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  CreditCard,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  buildStripeConnectAuthorizeUrl,
  requestSignedStripeOAuthState,
} from "~/app/admin/_components/payment/stripe-connect-utils";

type Props = {
  businessId: string;
  stripeAccountId: string | null;
  stripeAutoTaxEnabled: boolean;
};

export function StripeSettings({
  businessId,
  stripeAccountId,
  stripeAutoTaxEnabled: initialAutoTax,
}: Props) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [autoTaxEnabled, setAutoTaxEnabled] = useState(initialAutoTax);

  const [taxError, setTaxError] = useState<string | null>(null);

  const updateStripeSettings = api.business.updateStripeSettings.useMutation({
    onSuccess() {
      setTaxError(null);
      toast.success(
        autoTaxEnabled
          ? "Automatic tax collection enabled"
          : "Automatic tax collection disabled",
      );
    },
    onError(err) {
      // Revert the optimistic toggle and surface the server's message
      setAutoTaxEnabled(!autoTaxEnabled);
      setTaxError(err.message);
    },
  });

  const handleAutoTaxToggle = (checked: boolean) => {
    setTaxError(null);
    setAutoTaxEnabled(checked);
    updateStripeSettings.mutate({ stripeAutoTaxEnabled: checked });
  };

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      toast.success("Stripe account disconnected");
      window.location.reload();
    } catch (error) {
      toast.error("Failed to disconnect Stripe account");
      console.error(error);
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
      <CardContent className="space-y-6">
        {stripeAccountId ? (
          <>
            <div>
              <label className="text-sm font-medium">Account ID</label>
              <div className="mt-1 rounded border bg-muted p-3 font-mono text-sm">
                {stripeAccountId}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
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

            <div className="border-t pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="auto-tax-toggle">
                    Automatic Tax Collection
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Automatically calculate and collect sales tax at checkout
                    via Stripe Tax. Requires active tax registrations on your
                    Stripe account.{" "}
                    <Link
                      href="/admin/settings/tax"
                      className="underline underline-offset-2"
                    >
                      Set up taxes →
                    </Link>
                  </p>
                </div>
                <Switch
                  id="auto-tax-toggle"
                  checked={autoTaxEnabled}
                  onCheckedChange={handleAutoTaxToggle}
                  disabled={updateStripeSettings.isPending}
                />
              </div>

              {taxError && (
                <Alert variant="destructive" className="mt-3">
                  <AlertDescription className="text-sm">
                    {taxError}{" "}
                    <a
                      href="https://dashboard.stripe.com/tax"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      Open Stripe Tax Dashboard →
                    </a>
                  </AlertDescription>
                </Alert>
              )}

              {autoTaxEnabled && !taxError && (
                <Alert className="mt-3">
                  <AlertDescription className="text-sm">
                    Stripe will collect sales tax only in states where you have
                    active tax registrations. Customers in other states will not
                    be charged tax.{" "}
                    <a
                      href="https://dashboard.stripe.com/tax/registrations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      Manage registrations →
                    </a>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
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
