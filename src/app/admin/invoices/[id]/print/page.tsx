import { notFound } from "next/navigation";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { InvoiceDocument } from "~/components/invoices/invoice-document";

import { buildInvoiceDocumentProps } from "../_components/build-invoice-document-props";
import { AdminPrintStyles } from "../../../orders/[id]/_components/order-print-document";
import { PrintToolbar } from "./print-toolbar";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InvoicePrintPage({ params }: Props) {
  const { id } = await params;

  const [invoice, business] = await Promise.all([
    api.invoice.getById({ id }).catch(rethrowTrpcForErrorBoundary),
    api.business.simplifiedGet(),
  ]);

  if (!invoice) notFound();

  const documentProps = buildInvoiceDocumentProps(invoice, business);

  return (
    <>
      <AdminPrintStyles />
      <PrintToolbar invoiceId={invoice.id} />
      <div className="mx-auto my-8 max-w-3xl bg-white p-10 shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <InvoiceDocument {...documentProps} />
      </div>
    </>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const invoice = await api.invoice.getById({ id }).catch(() => null);
  return {
    title: invoice ? `Invoice — ${invoice.displayNumber}` : "Invoice",
  };
}
