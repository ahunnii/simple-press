import { notFound, redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";

import type { InvoiceBuilderValues } from "../../_components/builder/types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

import { buildPreviewIssuer } from "../../_components/build-preview-issuer";
import { InvoiceBuilderForm } from "../../_components/builder/invoice-builder-form";
import { TrailHeader } from "../../../_components/trail-header";

const LIST_PATH = "/admin/invoices";

type PageProps = {
  params: Promise<{ id: string }>;
};

/**
 * `getById` throws NOT_FOUND rather than returning null (tenant-scoped, so
 * "not yours" and "does not exist" are the same answer) — mirrors `loadForm`
 * in the forms builder's edit page.
 */
async function loadInvoice(id: string) {
  return api.invoice.getById({ id }).catch((error: unknown): never => {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    return rethrowTrpcForErrorBoundary(error);
  });
}

export default async function EditInvoicePage({ params }: PageProps) {
  const { id } = await params;

  const flags = await getBusinessFlags();
  if (!flags.isEnabled("invoices")) {
    return <GenericFeatureDisabledPage featureName="Invoices" />;
  }

  const [invoice, settings, business] = await Promise.all([
    loadInvoice(id),
    api.invoice.getSettings(),
    api.business.simplifiedGet(),
  ]);

  // The builder only ever opens a draft — a sent invoice is changed by
  // cancelling it and issuing a new one (`invoiceCapabilities.canEdit`).
  if (invoice.status !== "DRAFT") {
    redirect(`/admin/invoices/${id}`);
  }

  const initialValues: InvoiceBuilderValues = {
    customer: {
      customerId: invoice.customerId ?? undefined,
      name: invoice.customerName,
      email: invoice.customerEmail,
      phone: invoice.customerPhone ?? "",
      billingAddress: invoice.billingAddress ?? undefined,
    },
    lineItems: invoice.lineItems.map((line) => ({
      id: line.id,
      description: line.description,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      ...(line.productId ? { productId: line.productId } : {}),
      ...(line.variantId ? { variantId: line.variantId } : {}),
      ...(line.serviceItemId ? { serviceItemId: line.serviceItemId } : {}),
    })),
    discountType: invoice.discountType,
    discountValue: invoice.discountValue,
    taxRateBps: invoice.taxRateBps,
    dueTerms: invoice.dueTerms,
    customDueDate:
      invoice.dueTerms === "custom" ? (invoice.dueDateYmd ?? "") : "",
    notes: invoice.notes ?? "",
    terms: invoice.terms ?? "",
    paymentMethodIds: invoice.paymentMethodIds,
  };

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Invoices", href: LIST_PATH },
          { label: invoice.displayNumber, href: `/admin/invoices/${id}` },
          { label: "Edit" },
        ]}
      />
      <InvoiceBuilderForm
        settings={{
          numberPrefix: settings.numberPrefix,
          numberPadding: settings.numberPadding,
          nextInvoiceNumber: settings.nextInvoiceNumber,
          paymentMethods: settings.paymentMethods,
        }}
        initialValues={initialValues}
        existingInvoice={{
          id: invoice.id,
          displayNumber: invoice.displayNumber,
        }}
        previewIssuer={buildPreviewIssuer(business)}
        timeZone={business?.timeZone ?? "UTC"}
      />
    </>
  );
}

export const generateMetadata = async ({ params }: PageProps) => {
  const { id } = await params;
  const invoice = await loadInvoice(id);
  return { title: `Edit ${invoice.displayNumber}` };
};
