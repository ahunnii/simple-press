import Link from "next/link";
import { ArrowRight, CreditCard, Globe, Package, Palette, Store } from "lucide-react";

import { env } from "~/env";
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
  setupSteps: {
    businessCreated: boolean;
    stripeConnected: boolean;
    domainConfigured: boolean;
    firstProductAdded: boolean;
    storefrontCustomized: boolean;
  };
  completedSteps: number;
  totalSteps: number;
  vpsIp: string;
};

export function SetupChecklist({
  business,
  setupSteps,
  completedSteps,
  totalSteps,
  vpsIp,
}: Props) {
  const progress = (completedSteps / totalSteps) * 100;

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
          <div className="text-primary text-2xl font-bold">
            {Math.round(progress)}%
          </div>
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
          completed={setupSteps.businessCreated}
          icon={<Store className="h-5 w-5" />}
          title="Store Created"
          description="Your store has been set up successfully"
        />

        {/* Step 2: Connect Stripe */}
        <SetupStep
          completed={setupSteps.stripeConnected}
          icon={<CreditCard className="h-5 w-5" />}
          title="Connect Payment Processing"
          description={
            setupSteps.stripeConnected
              ? "Stripe is connected and ready to accept payments"
              : "Connect Stripe to start accepting payments from customers"
          }
          action={
            !setupSteps.stripeConnected && (
              <ConnectStripeButton
                businessId={business.id}
                stripeAccountId={business?.stripeAccountId ?? null}
              />
            )
          }
        />

        {/* Step 3: Configure Domain — required to complete setup */}
        <SetupStep
          completed={setupSteps.domainConfigured}
          icon={<Globe className="h-5 w-5" />}
          title="Connect a Custom Domain (Required)"
          description={
            setupSteps.domainConfigured
              ? `Your store is live at ${business.customDomain}`
              : `A custom domain is required to complete setup. Your subdomain (${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}) is temporary.`
          }
          action={<DomainSetup business={business} vpsIp={vpsIp} />}
        />

        {/* Step 4: Add First Product */}
        <SetupStep
          completed={setupSteps.firstProductAdded}
          icon={<Package className="h-5 w-5" />}
          title="Add Your First Product"
          description={
            setupSteps.firstProductAdded
              ? `You have ${business._count.products} product${business._count.products !== 1 ? "s" : ""}`
              : "Add products to start selling"
          }
          action={
            !setupSteps.firstProductAdded && (
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
          completed={setupSteps.storefrontCustomized}
          icon={<Palette className="h-5 w-5" />}
          title="Customize Your Storefront"
          description={
            setupSteps.storefrontCustomized
              ? "Your storefront has been customized"
              : "Upload a logo and edit your homepage sections to make the store your own"
          }
          action={
            !setupSteps.storefrontCustomized && (
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/content/branding">
                    Brand Identity
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/content/template">
                    Template Fields
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
