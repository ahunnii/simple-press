import { checkBusiness } from "~/lib/check-business";
import { getSession } from "~/server/better-auth/server";
import { db } from "~/server/db";

import { SiteHeader } from "../_components/site-header";
import { QuickActions } from "./_components/quick-actions";
import { SetupChecklist } from "./_components/setup-checklist";
import { WelcomeHeader } from "./_components/welcome-header";

export default async function AdminWelcomePage() {
  // Get current session
  const businessId = await checkBusiness();
  const session = await getSession();

  // Get user with business info
  const user = await db.user.findUnique({
    where: { id: session?.user?.id },
    include: {
      business: {
        where: { id: businessId?.id },
        include: {
          siteContent: true,
          _count: {
            select: {
              products: true,
              orders: true,
            },
          },
        },
      },
    },
  });

  if (!user?.business) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">No Business Found</h1>
          <p className="text-gray-600">
            Your account is not associated with a business.
          </p>
        </div>
      </div>
    );
  }

  const { business } = user;

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
      <SiteHeader title="Welcome!" />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <WelcomeHeader
          businessName={business.name}
          userName={user.name || user.email}
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
