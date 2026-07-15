"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  ExternalLink,
  Loader2,
  Save,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
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
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";

type Props = {
  business: NonNullable<RouterOutputs["business"]["getWithIntegrations"]>;
};

// Umami website IDs are UUIDs (e.g. "abc123-def456-...").
const UMAMI_WEBSITE_ID_REGEX = /^[a-zA-Z0-9-]+$/;

export function UmamiSettings({ business }: Props) {
  const router = useRouter();

  // Form state
  const [umamiWebsiteId, setUmamiWebsiteId] = useState(
    business.umamiWebsiteId ?? "",
  );
  const [umamiEnabled, setUmamiEnabled] = useState(business.umamiEnabled);
  const [websiteIdError, setWebsiteIdError] = useState<string | null>(null);

  const validateWebsiteId = (
    value: string,
    enabled: boolean,
  ): string | null => {
    const trimmed = value.trim();
    if (!trimmed) {
      return enabled
        ? "Website ID is required to enable analytics"
        : null;
    }
    if (!UMAMI_WEBSITE_ID_REGEX.test(trimmed)) {
      return "Enter a valid Umami website ID";
    }
    return null;
  };

  const updateIntegrationsMutation =
    api.business.updateIntegrations.useMutation({
      onSuccess: () => {
        toast.dismiss();
        toast.success("Umami settings updated");
        router.refresh();
      },
      onError: (error) => {
        toast.dismiss();
        toast.error(error.message ?? "Failed to update integrations");
      },
      onSettled: () => {
        router.refresh();
      },
      onMutate: () => {
        toast.loading("Updating Umami settings...");
      },
    });

  const handleSaveUmami = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateWebsiteId(umamiWebsiteId, umamiEnabled);
    if (validationError) {
      setWebsiteIdError(validationError);
      return;
    }
    setWebsiteIdError(null);

    updateIntegrationsMutation.mutate({
      umamiWebsiteId: umamiWebsiteId ?? undefined,
      umamiEnabled: umamiEnabled ?? undefined,
    });
  };

  return (
    <>
      <form onSubmit={handleSaveUmami}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Umami Analytics</CardTitle>
                <CardDescription>
                  Tracks visits, page views, referrers, and on-site events
                  (product views, add-to-cart, embed engagement) on your
                  storefront — without third-party cookies or ad-network
                  tracking. Once enabled, results appear on your{" "}
                  <Link
                    href="/admin/analytics"
                    className="underline underline-offset-2"
                  >
                    Analytics dashboard
                  </Link>
                  .
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
                onChange={(e) => {
                  setUmamiWebsiteId(e.target.value);
                  if (websiteIdError) setWebsiteIdError(null);
                }}
                onBlur={(e) =>
                  setWebsiteIdError(
                    validateWebsiteId(e.target.value, umamiEnabled),
                  )
                }
                placeholder="abc123-def456-ghi789"
                aria-invalid={!!websiteIdError}
              />
              {websiteIdError ? (
                <p className="text-destructive text-sm" role="alert">
                  {websiteIdError}
                </p>
              ) : (
                <p className="text-muted-foreground mt-1 text-sm">
                  Found on the website&apos;s Settings page in your Umami
                  account after you add your storefront domain there — not
                  your Umami account ID or API key.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="umamiEnabled">Enable Analytics</Label>
                <p className="text-muted-foreground text-sm">
                  Adds the tracking script to every storefront page, which
                  starts collecting visit data right away. Leave off to
                  collect nothing, regardless of the Website ID saved above.
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  This is independent of the{" "}
                  <Link
                    href="/admin/settings/features"
                    className="underline underline-offset-2"
                  >
                    Analytics feature flag
                  </Link>
                  : this toggle controls whether data is collected, while the
                  feature flag controls whether the in-admin Analytics
                  dashboard is visible. Turning this on without the feature
                  flag enabled means data is collected but you can&apos;t view
                  it in-app yet; turning the feature flag on without this
                  toggle enabled shows an empty dashboard.
                </p>
              </div>
              <Switch
                id="umamiEnabled"
                checked={umamiEnabled}
                onCheckedChange={(checked) => {
                  setUmamiEnabled(checked);
                  setWebsiteIdError(
                    validateWebsiteId(umamiWebsiteId, checked),
                  );
                }}
              />
            </div>

            <div className="border-t pt-2">
              <p className="text-muted-foreground mb-2 text-sm">
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
              <Button type="submit" disabled={updateIntegrationsMutation.isPending}>
                {updateIntegrationsMutation.isPending ? (
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
    </>
  );
}
