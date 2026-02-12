import { redirect } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";
import { api, HydrateClient } from "~/trpc/server";

import { ManualOrderForm } from "../_components/manual-order-form";
import { SiteHeader } from "../../_components/site-header";

export default async function NewOrderPage() {
  const business = await checkBusiness();

  if (!business) {
    redirect("/admin/welcome");
  }
  const products = await api.product.secureGetAll();

  return (
    <HydrateClient>
      <SiteHeader title="Create Manual Order" />
      <div className="admin-container">
        <ManualOrderForm businessId={business?.id} products={products} />
      </div>
    </HydrateClient>
  );
}
