"use client";

import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";

import { ViiAccountLayout } from "./vii-account-layout";

export function ViiInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <ViiAccountLayout
      heading="Invoices"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Invoices" },
      ]}
    >
      <InvoicesContent invoices={invoices} />
    </ViiAccountLayout>
  );
}
