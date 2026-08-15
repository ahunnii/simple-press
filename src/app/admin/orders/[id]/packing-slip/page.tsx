import { notFound } from "next/navigation";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import {
  AdminPrintStyles,
  OrderPrintDocument,
} from "../_components/order-print-document";
import { PrintToolbar } from "../_components/print-toolbar";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PackingSlipPage({ params }: Props) {
  const { id } = await params;

  const [order, business] = await Promise.all([
    api.order.getById(id).catch(rethrowTrpcForErrorBoundary),
    api.business.simplifiedGet(),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <>
      <AdminPrintStyles />
      <PrintToolbar orderId={order.id} />
      <div className="mx-auto my-8 max-w-3xl bg-white p-10 shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <OrderPrintDocument
          order={order}
          business={business}
          variant="packing-slip"
        />
      </div>
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const order = await api.order.getById(id);
  return {
    title: order
      ? `Packing Slip — Order #${order.orderNumber}`
      : "Packing Slip",
  };
}
