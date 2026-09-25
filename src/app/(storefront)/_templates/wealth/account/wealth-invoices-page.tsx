"use client";

import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";

import { WealthAccountLayout } from "./wealth-account-layout";

export function WealthInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <WealthAccountLayout
      heading="Invoices"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Invoices" },
      ]}
    >
      <InvoicesContent invoices={invoices} />
    </WealthAccountLayout>
  );
}
