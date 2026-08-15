import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { env } from "~/env";
import { computeSetupStatus } from "~/lib/admin/setup-steps";
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

  // Setup completion — shared with the dashboard's "Finish setting up" card.
  // domainConfigured requires an actual custom domain; the subdomain is temporary.
  const setupStatus = computeSetupStatus({
    stripeAccountId: business.stripeAccountId,
    customDomain: business.customDomain,
    productCount: business._count.products,
    siteContent: business.siteContent,
  });

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Welcome" }]} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <WelcomeHeader
          businessName={business.name}
          userName={session?.user.name ?? session?.user.email ?? ""}
          isComplete={setupStatus.isComplete}
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
              status={setupStatus}
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
