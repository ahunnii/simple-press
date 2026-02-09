import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "~/server/db";
import { StorefrontFooter } from "../_components/storefront-footer";
import { StorefrontHeader } from "../_components/storefront-header";
import { CartContents } from "./_components/cart-contents";

export default async function CartPage() {
  const headersList = await headers();
  const hostname = headersList.get("host") ?? "";
  const domain = hostname.split(":")[0];

  // Find business
  const business = await db.business.findFirst({
    where: {
      OR: [{ customDomain: domain }, { subdomain: domain?.split(".")[0] }],
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
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">
            Shopping Cart
          </h1>
          <CartContents business={business} />
        </div>
      </main>

      <StorefrontFooter business={business} />
    </div>
  );
}
