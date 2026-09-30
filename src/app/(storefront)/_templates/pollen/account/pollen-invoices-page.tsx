"use client";

import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";

import { PollenAccountLayout } from "./pollen-account-layout";

export function PollenInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <PollenAccountLayout heading="Invoices">
      <InvoicesContent invoices={invoices} />
    </PollenAccountLayout>
  );
}
