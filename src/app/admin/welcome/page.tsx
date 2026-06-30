import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

import { env } from "~/env";
import { checkBusiness } from "~/lib/check-business";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";
import { Button } from "~/components/ui/button";

import { TrailHeader } from "../_components/trail-header";
import { QuickActions } from "./_components/quick-actions";
import { SetupChecklist } from "./_components/setup-checklist";
import { WelcomeHeader } from "./_components/welcome-header";

export default async function AdminWelcomePage() {
  // Get current session
  const businessId = await checkBusiness();
  const session = await getSession();

  const business = await db.business.findUnique({
    where: { id: businessId?.id },
    include: {
      siteContent: true,
      _count: {
        select: { products: true, orders: true },
      },
    },
  });

  if (!business) {
    return notFound();
  }

  // Determine whether the storefront has been customized:
  // logo set OR any custom template fields saved.
  const siteContent = business.siteContent;
  const customFields = siteContent?.customFields;
  const storefrontCustomized =
    Boolean(siteContent?.logoUrl) ||
    (customFields !== null &&
      customFields !== undefined &&
      typeof customFields === "object" &&
      !Array.isArray(customFields) &&
      Object.keys(customFields as Record<string, unknown>).length > 0);

  // Calculate setup completion.
  // domainConfigured requires an actual custom domain — the subdomain is temporary.
  const setupSteps = {
    businessCreated: true,
    stripeConnected: !!business.stripeAccountId,
    domainConfigured: Boolean(business.customDomain),
    firstProductAdded: business._count.products > 0,
    storefrontCustomized,
  };

  const completedSteps = Object.values(setupSteps).filter(Boolean).length;
  const totalSteps = Object.keys(setupSteps).length;
  const isComplete = completedSteps === totalSteps;

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Welcome" }]} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <WelcomeHeader
          businessName={business.name}
          userName={session?.user.name ?? session?.user.email ?? ""}
          isComplete={isComplete}
        />

        {/* Escape hatch: let owners operate the store while finishing setup */}
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" asChild>
            <Link href="/admin/dashboard">
              Continue to dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-4 grid gap-8 lg:grid-cols-3">
          {/* Main Setup Checklist */}
          <div className="lg:col-span-2">
            <SetupChecklist
              business={business}
              setupSteps={setupSteps}
              completedSteps={completedSteps}
              totalSteps={totalSteps}
              vpsIp={env.VPS_IP}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <QuickActions business={business} />
          </div>
        </div>
      </div>
    </>
  );
}
