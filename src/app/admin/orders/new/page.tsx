import { api } from "~/trpc/server";

import { ManualOrderForm } from "../_components/manual-order-form";
import { TrailHeader } from "../../_components/trail-header";

export default async function NewOrderPage() {
  const products = await api.product.secureGetAll();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Orders", href: "/admin/orders" },
          { label: "New ManualOrder" },
        ]}
      />

      <ManualOrderForm products={products} />
    </>
  );
}

export const metadata = {
  title: "New Manual Order",
};
