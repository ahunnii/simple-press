"use client";

import type { Business, SiteContent } from "generated/prisma";
import {
  CheckCircle,
  ExternalLink,
  Loader2,
  Save,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { api } from "~/trpc/react";

// type Business = {
//   id: string;
//   stripeAccountId: string | null;
//   umamiWebsiteId: string | null;
//   umamiEnabled: boolean;
// };

type Props = {
  business: Business & { siteContent?: SiteContent | null };
};

export function IntegrationsSettings({ business }: Props) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [umamiWebsiteId, setUmamiWebsiteId] = useState(
    business.umamiWebsiteId ?? "",
  );
  const [umamiEnabled, setUmamiEnabled] = useState(business.umamiEnabled);

  const handleConnectStripe = () => {
    // Redirect to Stripe Connect OAuth
    const clientId = process.env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/stripe/callback`;
    const state = business.id;

    window.location.href = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${redirectUri}&state=${state}`;
  };

  const updateIntegrationsMutation =
    api.business.updateIntegrations.useMutation({
      onSuccess: () => {
        router.refresh();
        setSuccess(true);
      },
      onError: (error) => {
        setError(error.message ?? "Failed to update integrations");
      },
      onSettled: () => {
        setIsSaving(false);
        router.refresh();
      },
    });
  const handleSaveUmami = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    updateIntegrationsMutation.mutate({
      umamiWebsiteId: umamiWebsiteId ?? undefined,
      umamiEnabled: umamiEnabled ?? undefined,
    });

    // try {
    //   const response = await fetch(
    //     `/api/business/${business.id}/integrations`,
    //     {
    //       method: "PATCH",
    //       headers: { "Content-Type": "application/json" },
    //       body: JSON.stringify({
    //         umamiWebsiteId: umamiWebsiteId || null,
    //         umamiEnabled,
    //       }),
    //     },
    //   );

    //   if (!response.ok) {
    //     const data = await response.json();
    //     throw new Error(data.error || "Failed to update integrations");
    //   }

    //   setSuccess(true);
    //   router.refresh();

    //   setTimeout(() => setSuccess(false), 3000);
    // } catch (err: any) {
    //   setError(err.message);
    // } finally {
    //   setIsSaving(false);
    // }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>
            Integrations updated successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Stripe */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stripe Connect</CardTitle>
              <CardDescription>
                Accept payments from your customers
              </CardDescription>
            </div>
            {business.stripeAccountId ? (
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
          {business.stripeAccountId ? (
            <div>
              <Label>Account ID</Label>
              <Input
                value={business.stripeAccountId}
                disabled
                className="bg-gray-50 font-mono text-sm"
              />
              <p className="mt-2 text-sm text-gray-500">
                Your Stripe account is connected. Payments will be deposited to
                this account.
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <a
                  href="https://dashboard.stripe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Stripe Dashboard
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm text-gray-600">
                Connect your Stripe account to start accepting payments. Stripe
                handles all payment processing securely.
              </p>
              <Button onClick={handleConnectStripe}>
                Connect Stripe Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Umami Analytics */}
      <form onSubmit={handleSaveUmami}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Umami Analytics</CardTitle>
                <CardDescription>
                  Privacy-focused website analytics
                </CardDescription>
              </div>
              {umamiEnabled && umamiWebsiteId ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Disabled
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="umamiWebsiteId">Website ID</Label>
              <Input
                id="umamiWebsiteId"
                value={umamiWebsiteId}
                onChange={(e) => setUmamiWebsiteId(e.target.value)}
                placeholder="abc123-def456-ghi789"
              />
              <p className="mt-1 text-sm text-gray-500">
                Your Umami website tracking ID
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="umamiEnabled">Enable Analytics</Label>
                <p className="text-sm text-gray-500">
                  Track visitor data on your storefront
                </p>
              </div>
              <Switch
                id="umamiEnabled"
                checked={umamiEnabled}
                onCheckedChange={setUmamiEnabled}
              />
            </div>

            <div className="border-t pt-2">
              <p className="mb-2 text-sm text-gray-600">
                Don&apos;t have a Umami account?
              </p>
              <Button type="button" variant="outline" size="sm" asChild>
                <a
                  href="https://umami.is"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sign up for Umami
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="border-t pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
