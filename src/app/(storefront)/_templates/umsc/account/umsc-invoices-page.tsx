"use client";

import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";

import { UmscAccountLayout } from "./umsc-account-layout";

export function UmscInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <UmscAccountLayout
      heading="Invoices"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Invoices" },
      ]}
    >
      <InvoicesContent invoices={invoices} />
    </UmscAccountLayout>
  );
}
