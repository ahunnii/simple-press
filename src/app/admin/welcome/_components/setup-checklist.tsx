import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CreditCard,
  FileText,
  Globe,
  HeartHandshake,
  Package,
  Palette,
  Phone,
  Receipt,
  Store,
  Truck,
} from "lucide-react";

import type {
  SetupFacts,
  SetupStatus,
  SetupTask,
} from "~/lib/admin/setup-steps";
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
import { StripeConnectReturnToast } from "../../_components/payment/stripe-connect-return-toast";
import { ConfirmStepButton } from "./confirm-step-button";
import { SetupStep } from "./setup-step";

type Business = {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  domainStatus: string;
  stripeAccountId: string | null;
};

type Props = {
  business: Business;
  /** Built by `computeSetupStatus` — one row per visible step, in order. */
  status: SetupStatus;
  /** Counts + contact facts the row descriptions read. */
  facts: SetupFacts;
  /** The Tax Guide lives under Finances, which needs payments or donations. */
  showTaxGuide: boolean;
  vpsIp: string;
};

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

/** Small outline link-button used by the settings shortcuts. */
function StepLink({ href, children }: { href: string; children: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>
        {children}
        <ArrowRight className="ml-2 h-3 w-3" />
      </Link>
    </Button>
  );
}

export function SetupChecklist({
  business,
  status,
  facts,
  showTaxGuide,
  vpsIp,
}: Props) {
  const completedSteps = status.completed;
  const totalSteps = status.total;
  const progress = status.percent;

  /** Row for one step; `done` is the checklist's own score, not a re-derivation. */
  const renderStep = (task: SetupTask) => {
    const done = task.score === 1;
    const rowProps = {
      completed: done,
      level: task.key === "businessCreated" ? undefined : task.level,
    };

    // Confirmable rows: settings shortcuts + "Mark as done" while open; once the
    // owner has confirmed, "Marked as done" + Undo. Done by the automatic rule
    // (not confirmed) gets no button at all.
    const confirmAction = (links: React.ReactNode) => {
      if (task.key === "businessCreated") return null;
      if (task.confirmed) {
        return <ConfirmStepButton step={task.key} confirmed />;
      }
      if (done) return null;
      return (
        <div className="flex flex-wrap items-center gap-2">
          {links}
          <ConfirmStepButton step={task.key} confirmed={false} />
        </div>
      );
    };

    switch (task.key) {
      case "businessCreated":
        return (
          <SetupStep
            key={task.key}
            {...rowProps}
            icon={<Store className="h-5 w-5" />}
            title="Store Created"
            description="Your store has been set up successfully"
          />
        );

      case "stripeConnected":
        return (
          <SetupStep
            key={task.key}
            {...rowProps}
            icon={<CreditCard className="h-5 w-5" />}
            title="Connect Payment Processing"
            description={
              done
                ? "Stripe is connected and ready to accept payments"
                : "Connect Stripe to start accepting payments from customers"
            }
            action={
              !done && (
                <ConnectStripeButton
                  businessId={business.id}
                  stripeAccountId={business.stripeAccountId}
                />
              )
            }
          />
        );

      case "domainConfigured":
        return (
          <SetupStep
            key={task.key}
            {...rowProps}
            icon={<Globe className="h-5 w-5" />}
            title="Connect a Custom Domain"
            description={
              done
                ? `Your store is live at ${business.customDomain}`
                : `${task.level === "required" ? "A custom domain is required to complete setup. " : ""}Your subdomain (${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}) is temporary.`
            }
            action={<DomainSetup business={business} vpsIp={vpsIp} />}
          />
        );

      case "firstProductAdded":
        return (
          <SetupStep
            key={task.key}
            {...rowProps}
            icon={<Package className="h-5 w-5" />}
            title="Add Your First Product"
            description={
              done
                ? `You have ${plural(facts.productCount, "product")}`
                : "Add products to start selling"
            }
            action={
              !done && (
                <Button asChild>
                  <Link href="/admin/products/new">
                    Add Product
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )
            }
          />
        );

      case "salesTax":
        return (
          <SetupStep
            key={task.key}
            {...rowProps}
            icon={<Receipt className="h-5 w-5" />}
            title="Set Up Sales Tax"
            description={
              done
                ? "Sales tax is handled"
                : "Turn on automatic tax collection in your Stripe settings, or confirm you've handled sales tax another way"
            }
            action={confirmAction(
              <>
                <StepLink href="/admin/settings/integrations">
                  Turn on automatic tax
                </StepLink>
                {showTaxGuide && (
                  <StepLink href="/admin/finances/tax-guide">
                    Tax Guide
                  </StepLink>
                )}
              </>,
            )}
          />
        );

      case "shippingPickup":
        return (
          <SetupStep
            key={task.key}
            {...rowProps}
            icon={<Truck className="h-5 w-5" />}
            title="Set Up Shipping or Pickup"
            description={
              done
                ? "Shipping or pickup is set up"
                : "Choose how customers receive orders: shipping rates, in-store pickup, or both. Free shipping everywhere is fine too — just mark it done"
            }
            action={confirmAction(
              <StepLink href="/admin/settings/shipping">
                Shipping settings
              </StepLink>,
            )}
          />
        );

      case "firstServiceAdded":
        return (
          <SetupStep
            key={task.key}
            {...rowProps}
            icon={<Briefcase className="h-5 w-5" />}
            title="Add Your First Service"
            description={
              done
                ? `You have ${plural(facts.serviceCount, "service")}`
                : "List what you offer so customers can book or inquire"
            }
            action={
              !done && (
                <Button asChild>
                  <Link href="/admin/services/new">
                    Add Service
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )
            }
          />
        );

      case "donationsSetup":
        return (
          <SetupStep
            key={task.key}
            {...rowProps}
            icon={<HeartHandshake className="h-5 w-5" />}
            title="Set Up Donations"
            description={
              done
                ? "Supporters can donate to your store"
                : "Connect Stripe, or add a Venmo or Cash App handle, so supporters can give"
            }
            action={
              !done && (
                <StepLink href="/admin/settings/donations">
                  Donation settings
                </StepLink>
              )
            }
          />
        );

      case "contactInfo":
        return (
          <SetupStep
            key={task.key}
            {...rowProps}
            icon={<Phone className="h-5 w-5" />}
            title="Add Your Contact Info"
            description={
              done
                ? "Customers can reach you"
                : "Add a phone number, support email, or address so customers can reach you"
            }
            action={
              !done && (
                <StepLink href="/admin/settings/general">
                  Contact settings
                </StepLink>
              )
            }
          />
        );

      case "policiesLive":
        return (
          <SetupStep
            key={task.key}
            {...rowProps}
            icon={<FileText className="h-5 w-5" />}
            title="Publish Your Store Policies"
            description={
              done
                ? "Your Terms of Service and Refund Policy are published"
                : "Publish your Terms of Service and Refund Policy"
            }
            action={
              !done && (
                <StepLink href="/admin/content/policies">Policies</StepLink>
              )
            }
          />
        );

      case "storefrontCustomized":
        return (
          <SetupStep
            key={task.key}
            {...rowProps}
            icon={<Palette className="h-5 w-5" />}
            title="Customize Your Storefront"
            description={
              done
                ? "Your storefront has been customized"
                : "Upload a logo and edit your homepage sections to make the store your own"
            }
            action={
              !done && (
                <div className="flex flex-wrap gap-2">
                  <StepLink href="/admin/content/branding">
                    Brand Identity
                  </StepLink>
                  <StepLink href="/editor">Site Editor</StepLink>
                </div>
              )
            }
          />
        );
    }
  };

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
        {/* ConnectStripeButton mounts its own return toast, but it's gone once
            the OAuth round-trip succeeds — so the success toast mounts here. */}
        {status.items.some(
          (t) => t.key === "stripeConnected" && t.score === 1,
        ) && <StripeConnectReturnToast />}
        {status.items.map(renderStep)}
      </CardContent>
    </Card>
  );
}
