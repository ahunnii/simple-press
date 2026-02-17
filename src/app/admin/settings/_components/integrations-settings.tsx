"use client";

import type { Business, SiteContent } from "generated/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { env } from "~/env";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

import { StripeSettings } from "./stripe-settings";
import { UmamiSettings } from "./umami-settings";

type Props = {
  business: Business & { siteContent?: SiteContent | null };
};

export function IntegrationsSettings({ business }: Props) {
  const isDirty = false;

  return (
    <>
      <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
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

            <span
              className={`admin-status-badge ${
                isDirty ? "isDirty" : "isPublished"
              }`}
            >
              {isDirty ? "Unsaved Changes" : "Saved"}
            </span>
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
          />

          {/* Umami Analytics */}
          {!!env.NEXT_PUBLIC_ENABLE_UMAMI && (
            <UmamiSettings business={business} />
          )}
        </div>
      </div>
    </>
  );
}
