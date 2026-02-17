import { notFound } from "next/navigation";

import { db } from "~/server/db";
import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { EmailPreview } from "./_components/email-preview";

export default async function EmailPreviewPage() {
  const business = await api.business.get();
  if (!business) notFound();

  // Get a sample order for preview
  const sampleOrder = await db.order.findFirst({
    where: { businessId: business.id },
    include: {
      items: true,
      shippingAddress: true,
    },
  });

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Email Previews" }]} />
      <EmailPreview business={business} sampleOrder={sampleOrder} />
    </>
  );
}

export const metadata = {
  title: "Email Previews",
};
