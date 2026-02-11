import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

import { EmailPreview } from "./_components/email-preview";

export default async function EmailPreviewPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      business: {
        include: {
          siteContent: true,
        },
      },
    },
  });

  if (!user?.business) {
    redirect("/admin/welcome");
  }

  // Get a sample order for preview
  const sampleOrder = await db.order.findFirst({
    where: { businessId: user.business.id },
    include: {
      items: true,
      shippingAddress: true,
    },
  });

  return <EmailPreview business={user.business} sampleOrder={sampleOrder} />;
}
