"use client";

import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";

import { OliveAccountLayout } from "./olive-account-layout";

export function OliveInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <OliveAccountLayout
      heading="Invoices"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Invoices" },
      ]}
    >
      <InvoicesContent invoices={invoices} />
    </OliveAccountLayout>
  );
}
