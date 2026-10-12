import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { env } from "~/env";
import { loadSetupStatus } from "~/lib/admin/setup-status.server";
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

  if (!businessId) {
    return notFound();
  }

  // Setup completion — shared with the dashboard's "Finish setting up" card,
  // the sidebar nudge, and the /admin redirect gate. Which steps show (and
  // which are required) comes from the store's business type; flags resolve
  // from the same row. The business read is only the columns the checklist
  // rows and Quick Actions show — everything else comes from `setup`.
  const [business, setup] = await Promise.all([
    db.business.findUnique({
      where: { id: businessId.id },
      select: {
        id: true,
        name: true,
        subdomain: true,
        customDomain: true,
        domainStatus: true,
        stripeAccountId: true,
      },
    }),
    loadSetupStatus(businessId.id),
  ]);

  if (!business || !setup) {
    return notFound();
  }

  const setupStatus = setup.status;
  // The Tax Guide sits under Finances, whose layout needs payments or donations.
  const showTaxGuide =
    setup.flags.isEnabled("payments") || setup.flags.isEnabled("donations");

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Welcome" }]} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <WelcomeHeader
          businessName={business.name}
          userName={session?.user.name ?? session?.user.email ?? ""}
          isComplete={setupStatus.isComplete}
          requiredComplete={setupStatus.requiredComplete}
          requiredRemaining={setupStatus.requiredRemaining}
          launched={setup.gateComplete}
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
              facts={setup.facts}
              showTaxGuide={showTaxGuide}
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
