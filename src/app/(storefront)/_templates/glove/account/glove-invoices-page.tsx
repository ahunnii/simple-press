"use client";

import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";

import { GloveAccountLayout } from "./glove-account-layout";

/** Invoices: wraps the shared read-only `InvoicesContent` list. */
export function GloveInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <GloveAccountLayout heading="Invoices">
      <InvoicesContent invoices={invoices} />
    </GloveAccountLayout>
  );
}
