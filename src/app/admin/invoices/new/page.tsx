import type { InvoiceBuilderValues } from "../_components/builder/types";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

import { buildPreviewIssuer } from "../_components/build-preview-issuer";
import { InvoiceBuilderForm } from "../_components/builder/invoice-builder-form";
import { TrailHeader } from "../../_components/trail-header";

const LIST_PATH = "/admin/invoices";

type PageProps = {
  searchParams: Promise<{ customerId?: string | string[] }>;
};

/**
 * The admin customer detail page links here with `?customerId=<id>` ("New
 * invoice" for a known customer). Looked up scoped to the business
 * (`customer.getById` already `findFirst`s on `{ id, businessId }`, so a
 * foreign or bogus id just returns `null`); any miss is ignored silently and
 * the builder falls back to a blank customer, same as loading the page with
 * no query param at all.
 */
async function loadPrefillCustomer(customerId: string | undefined) {
  if (!customerId) return null;
  return api.customer.getById(customerId);
}

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("invoices")) {
    return <GenericFeatureDisabledPage featureName="Invoices" />;
  }

  const { customerId } = await searchParams;
  const requestedCustomerId = Array.isArray(customerId)
    ? customerId[0]
    : customerId;

  const [settings, prefillCustomer, business] = await Promise.all([
    api.invoice.getSettings(),
    loadPrefillCustomer(requestedCustomerId),
    api.business.simplifiedGet(),
  ]);

  const prefillName = prefillCustomer
    ? [prefillCustomer.firstName, prefillCustomer.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || prefillCustomer.email
    : "";

  // Concrete defaults for every optional key — never `undefined` — so
  // react-hook-form's `isDirty` compares against the same shape the owner
  // ends up editing, instead of flipping "dirty" the instant a field with no
  // explicit default value below is touched.
  const initialValues: InvoiceBuilderValues = {
    customer: prefillCustomer
      ? {
          customerId: prefillCustomer.id,
          name: prefillName,
          email: prefillCustomer.email,
          phone: prefillCustomer.phone ?? "",
          billingAddress: undefined,
        }
      : { name: "", email: "", phone: "", billingAddress: undefined },
    lineItems: [
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unitPriceCents: 0,
      },
    ],
    discountType: null,
    discountValue: 0,
    taxRateBps: settings.defaultTaxRateBps,
    dueTerms: settings.defaultDueTerms,
    customDueDate: "",
    notes: settings.defaultNotes ?? "",
    terms: settings.defaultTerms ?? "",
    paymentMethodIds: settings.paymentMethods.map((method) => method.id),
  };

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Invoices", href: LIST_PATH },
          { label: "New invoice" },
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
        previewIssuer={buildPreviewIssuer(business)}
        timeZone={business?.timeZone ?? "UTC"}
      />
    </>
  );
}

export const metadata = {
  title: "New Invoice",
};
