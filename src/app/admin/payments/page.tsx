import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { PaymentsOverview } from "./_components/payments-overview";

export default async function PaymentsPage() {
  const data = await api.business.getPaymentsOverview();

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Payments" }]} />
      <PaymentsOverview data={data} />
    </>
  );
}

export const metadata = {
  title: "Payments",
};
