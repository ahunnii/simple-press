import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "~/server/db";
import { StorefrontFooter } from "../../_components/storefront-footer";
import { StorefrontHeader } from "../../_components/storefront-header";
import { OrderConfirmation } from "./_components/order-confirmation";

export default async function OrderSuccessPage() {
  const headersList = await headers();
  const hostname = headersList.get("host") || "";
  let domain = hostname.split(":")[0];

  // Find business
  const business = await prisma.business.findFirst({
    where: {
      OR: [{ customDomain: domain }, { subdomain: domain.split(".")[0] }],
      status: "active",
    },
    include: {
      siteContent: true,
    },
  });

  if (!business) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StorefrontHeader business={business} />

      <main className="flex-1 px-4 py-12">
        <Suspense
          fallback={
            <div className="mx-auto max-w-2xl text-center">
              <p>Loading...</p>
            </div>
          }
        >
          <OrderConfirmation business={business} />
        </Suspense>
      </main>

      <StorefrontFooter business={business} />
    </div>
  );
}
