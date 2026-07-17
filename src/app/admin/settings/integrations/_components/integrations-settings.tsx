"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

import { StripeSettings } from "./stripe-settings";
import { UmamiSettings } from "./umami-settings";

type Props = {
  business: NonNullable<RouterOutputs["business"]["getWithIntegrations"]>;
};

export function IntegrationsSettings({ business }: Props) {
  // This page has no single form-wide save state to report: Stripe's
  // auto-tax toggle saves itself immediately on change, and Umami has its
  // own independent form with its own Save button and pending/success
  // toasts (see stripe-settings.tsx / umami-settings.tsx). A page-level
  // "Saved" badge here would be decorative at best and misleading at worst
  // (it can't see into either sub-form's actual dirty state), so it's
  // intentionally omitted rather than faked.
  return (
    <>
      <div className={cn("admin-form-toolbar")}>
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <h1 className="text-base font-medium">Integrations</h1>
          </div>
        </div>

        <div className="toolbar-actions"></div>
      </div>
      <div className="admin-container">
        <div className="space-y-6">
          {/* Stripe */}
          <StripeSettings
            businessId={business.id}
            stripeAccountId={business.stripeAccountId}
            stripeAutoTaxEnabled={business.stripeAutoTaxEnabled}
          />

          {/* Umami Analytics */}
          <UmamiSettings business={business} />
        </div>
      </div>
    </>
  );
}
