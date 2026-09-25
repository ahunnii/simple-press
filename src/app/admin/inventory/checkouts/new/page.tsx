import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

import { TrailHeader } from "../../../_components/trail-header";
import { NewCheckoutForm } from "./_components/new-checkout-form";

type Props = {
  searchParams: Promise<{ item?: string }>;
};

export default async function NewInventoryCheckoutPage({
  searchParams,
}: Props) {
  await requireAdminAccess();
  const flags = await getBusinessFlags();
  const rentalsEnabled = flags.isEnabled("inventoryRentals");

  // `create` and `availableRentalItems` are both gated on `inventoryRentals`
  // (see `coGated` in the router) — don't call either when it's off, and
  // show the standard disabled page instead of an error boundary.
  if (!rentalsEnabled) {
    return <GenericFeatureDisabledPage featureName="Rental Check-outs" />;
  }

  const { item } = await searchParams;

  const items = await api.inventoryCheckout
    .availableRentalItems()
    .catch(rethrowTrpcForErrorBoundary);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Inventory", href: "/admin/inventory" },
          { label: "Check-outs", href: "/admin/inventory/checkouts" },
          { label: "New" },
        ]}
      />
      <NewCheckoutForm items={items} preselectItemId={item} />
    </>
  );
}

export const metadata = {
  title: "New check-out",
};
