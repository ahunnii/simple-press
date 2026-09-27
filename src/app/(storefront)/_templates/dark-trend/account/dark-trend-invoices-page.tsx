"use client";

import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";

import { DarkTrendAccountLayout } from "./dark-trend-account-layout";

export function DarkTrendInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <DarkTrendAccountLayout heading="Invoices">
      <InvoicesContent invoices={invoices} />
    </DarkTrendAccountLayout>
  );
}
