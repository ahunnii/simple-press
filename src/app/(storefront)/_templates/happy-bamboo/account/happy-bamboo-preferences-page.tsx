"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { PageTransition } from "~/components/page-animations";

import type { AccountPreferencesPageProps } from "../../types";
import { HappyBambooAccountLayout } from "./happy-bamboo-account-layout";

export function HappyBambooPreferencesPage({
  business,
  customer,
}: AccountPreferencesPageProps) {
  const [acceptsMarketing, setAcceptsMarketing] = useState(
    customer?.acceptsMarketing ?? false,
  );

  const { mutate, isPending } =
    api.customer.updateMarketingPreference.useMutation({
      onSuccess: (_, variables) => {
        setAcceptsMarketing(variables.acceptsMarketing);
        toast.success(
          variables.acceptsMarketing
            ? "You're now subscribed to marketing emails."
            : "You've unsubscribed from marketing emails.",
        );
      },
      onError: () => {
        toast.error("Failed to update preference. Please try again.");
      },
    });

  return (
    <PageTransition>
      <HappyBambooAccountLayout
        heading="Preferences"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Preferences" },
        ]}
      >
        <div className="max-w-xl space-y-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="font-heading text-base font-semibold">
                Marketing Emails
              </CardTitle>
              <CardDescription>
                Receive news, promotions, and updates from {business.name}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!customer ? (
                <p className="text-muted-foreground text-sm">
                  Place your first order to enable email preferences.
                </p>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {acceptsMarketing ? "Subscribed" : "Unsubscribed"}
                  </span>
                  <Switch
                    checked={acceptsMarketing}
                    disabled={isPending}
                    onCheckedChange={(checked) =>
                      mutate({ acceptsMarketing: checked })
                    }
                    aria-label="Toggle marketing emails"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </HappyBambooAccountLayout>
    </PageTransition>
  );
}
