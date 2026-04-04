import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { ManualOrderForm } from "../_components/manual-order-form";
import { TrailHeader } from "../../_components/trail-header";

export default async function NewOrderPage() {
  const products = await api.product
    .secureGetAll()
    .catch(rethrowTrpcForErrorBoundary);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Orders", href: "/admin/orders" },
          { label: "New Manual Order" },
        ]}
      />

      <ManualOrderForm products={products} />
    </>
  );
}

export const metadata = {
  title: "New Manual Order",
};
