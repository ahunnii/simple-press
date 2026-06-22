import { notFound } from "next/navigation";

import { env } from "~/env";
import { checkBusiness } from "~/lib/check-business";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";

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

  // Calculate setup completion
  const setupSteps = {
    businessCreated: true,
    stripeConnected: !!business.stripeAccountId,
    domainConfigured:
      business.domainStatus === "ACTIVE" || business.subdomain !== null,
    firstProductAdded: business._count.products > 0,
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

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
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
