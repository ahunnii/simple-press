import Link from "next/link";
import { ArrowRight, CreditCard, Globe, Package, Store } from "lucide-react";

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
  };
  completedSteps: number;
  totalSteps: number;
};

export function SetupChecklist({
  business,
  setupSteps,
  completedSteps,
  totalSteps,
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
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(progress)}%
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
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
                // subdomain={business.subdomain}
              />
            )
          }
        />

        {/* Step 3: Configure Domain */}
        <SetupStep
          completed={setupSteps.domainConfigured}
          icon={<Globe className="h-5 w-5" />}
          title="Configure Your Domain"
          description={
            setupSteps.domainConfigured
              ? `Your store is accessible at ${business.customDomain ?? `${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`}`
              : "Set up your custom domain or use your free subdomain"
          }
          action={<DomainSetup business={business} />}
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
      </CardContent>
    </Card>
  );
}
