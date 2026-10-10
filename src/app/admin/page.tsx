import { redirect } from "next/navigation";

import { isSetupGateComplete } from "~/lib/admin/setup-steps";
import { checkBusiness } from "~/lib/check-business";
import { db } from "~/server/db";

export default async function AdminPage() {
  const businessMeta = await checkBusiness();

  if (!businessMeta) {
    redirect("/admin/welcome");
  }

  const business = await db.business.findUnique({
    where: { id: businessMeta.id },
    select: {
      stripeAccountId: true,
      customDomain: true,
      _count: { select: { products: true } },
    },
  });

  if (!business) {
    redirect("/admin/welcome");
  }

  // Custom domain is a hard requirement (see isSetupGateComplete). Owners should
  // not operate on the platform subdomain.
  const setupComplete = isSetupGateComplete({
    stripeAccountId: business.stripeAccountId,
    customDomain: business.customDomain,
    productCount: business._count.products,
  });

  redirect(setupComplete ? "/admin/dashboard" : "/admin/welcome");
}
