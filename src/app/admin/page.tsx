import { redirect } from "next/navigation";

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

  // All three conditions must be met: Stripe connected, ≥1 product, custom domain set.
  // Custom domain is a hard requirement — owners should not operate on the platform subdomain.
  const setupComplete =
    Boolean(business.stripeAccountId) &&
    business._count.products > 0 &&
    Boolean(business.customDomain);

  redirect(setupComplete ? "/admin/dashboard" : "/admin/welcome");
}
