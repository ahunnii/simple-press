import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  Globe,
  Package,
  Palette,
  Store,
} from "lucide-react";

import type { ChecklistSummary } from "~/lib/admin/checklist";
import { env } from "~/env";
import { isChecklistItemComplete } from "~/lib/admin/checklist";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { DomainSetup } from "../../_components/domain/domain-setup";
import { ConnectStripeButton } from "../../_components/payment/connect-stripe-button";
import { SetupStep } from "./setup-step";

type Business = {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  domainStatus: string;
  stripeAccountId: string | null;
  _count: {
    products: number;
  };
};

type Props = {
  business: Business;
  /** Built by `computeSetupStatus` — rows are looked up by key below. */
  status: ChecklistSummary;
  vpsIp: string;
};

export function SetupChecklist({ business, status, vpsIp }: Props) {
  const completedSteps = status.completed;
  const totalSteps = status.total;
  const progress = status.percent;

  const businessCreated = isChecklistItemComplete(status, "businessCreated");
  const stripeConnected = isChecklistItemComplete(status, "stripeConnected");
  const domainConfigured = isChecklistItemComplete(status, "domainConfigured");
  const firstProductAdded = isChecklistItemComplete(
    status,
    "firstProductAdded",
  );
  const storefrontCustomized = isChecklistItemComplete(
    status,
    "storefrontCustomized",
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Setup Progress</CardTitle>
            <CardDescription>
              {completedSteps} of {totalSteps} steps completed
            </CardDescription>
          </div>
          <div className="text-primary text-2xl font-bold">{progress}%</div>
        </div>
        {/* Progress Bar */}
        <div className="bg-muted mt-4 h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Business Created */}
        <SetupStep
          completed={businessCreated}
          icon={<Store className="h-5 w-5" />}
          title="Store Created"
          description="Your store has been set up successfully"
        />

        {/* Step 2: Connect Stripe */}
        <SetupStep
          completed={stripeConnected}
          icon={<CreditCard className="h-5 w-5" />}
          title="Connect Payment Processing"
          description={
            stripeConnected
              ? "Stripe is connected and ready to accept payments"
              : "Connect Stripe to start accepting payments from customers"
          }
          action={
            !stripeConnected && (
              <ConnectStripeButton
                businessId={business.id}
                stripeAccountId={business?.stripeAccountId ?? null}
              />
            )
          }
        />

        {/* Step 3: Configure Domain — required to complete setup */}
        <SetupStep
          completed={domainConfigured}
          icon={<Globe className="h-5 w-5" />}
          title="Connect a Custom Domain (Required)"
          description={
            domainConfigured
              ? `Your store is live at ${business.customDomain}`
              : `A custom domain is required to complete setup. Your subdomain (${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}) is temporary.`
          }
          action={<DomainSetup business={business} vpsIp={vpsIp} />}
        />

        {/* Step 4: Add First Product */}
        <SetupStep
          completed={firstProductAdded}
          icon={<Package className="h-5 w-5" />}
          title="Add Your First Product"
          description={
            firstProductAdded
              ? `You have ${business._count.products} product${business._count.products !== 1 ? "s" : ""}`
              : "Add products to start selling"
          }
          action={
            !firstProductAdded && (
              <Button asChild>
                <Link href="/admin/products/new">
                  Add Product
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )
          }
        />

        {/* Step 5: Customize Storefront */}
        <SetupStep
          completed={storefrontCustomized}
          icon={<Palette className="h-5 w-5" />}
          title="Customize Your Storefront"
          description={
            storefrontCustomized
              ? "Your storefront has been customized"
              : "Upload a logo and edit your homepage sections to make the store your own"
          }
          action={
            !storefrontCustomized && (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/content/branding">
                    Brand Identity
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/editor">
                    Site Editor
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            )
          }
        />
      </CardContent>
    </Card>
  );
}
