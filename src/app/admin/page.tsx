import { redirect } from "next/navigation";

import { loadSetupGate } from "~/lib/admin/setup-status.server";
import { checkBusiness } from "~/lib/check-business";

export default async function AdminPage() {
  const businessMeta = await checkBusiness();

  if (!businessMeta) {
    redirect("/admin/welcome");
  }

  const gate = await loadSetupGate(businessMeta.id);

  if (!gate) {
    redirect("/admin/welcome");
  }

  // The gate is the store's REQUIRED setup steps (see `computeSetupStatus`) —
  // optional steps never hold an owner on the Setup Guide. Legacy stores keep
  // the original rule: Stripe, a first product, and a custom domain (owners
  // should not operate on the platform subdomain). Once passed it latches
  // (`setupCompletedAt`), so a launched store always opens the dashboard.
  redirect(gate.gateComplete ? "/admin/dashboard" : "/admin/welcome");
}
