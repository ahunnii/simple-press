import { redirect } from "next/navigation";

import { getAllowedCountries } from "~/lib/geo/regions";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { ManualOrderForm } from "../_components/manual-order-form";
import { TrailHeader } from "../../_components/trail-header";

export default async function NewOrderPage() {
  // The layout's STAFF guard matches `/admin/orders` by prefix, so it lets
  // staff through to this route — but both queries below and `createManual`
  // itself are `ownerAdminProcedure`, which would surface as an error boundary
  // rather than a permission message. Send them back to the list instead.
  const { membershipRole } = await requireAdminAccess();
  if (membershipRole === "STAFF") redirect("/admin/orders");

  const [products, business] = await Promise.all([
    api.product.secureGetAll().catch(rethrowTrpcForErrorBoundary),
    api.business.simplifiedGet(),
  ]);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Orders", href: "/admin/orders" },
          { label: "New Manual Order" },
        ]}
      />

      <ManualOrderForm
        products={products}
        allowedCountries={getAllowedCountries(business?.salesCountries ?? [])}
      />
    </>
  );
}

export const metadata = {
  title: "New Manual Order",
};
