"use client";

import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";

import { DreamAccountLayout } from "./dream-account-layout";

export function DreamInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <DreamAccountLayout
      heading="Invoices"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Invoices" },
      ]}
    >
      <InvoicesContent invoices={invoices} />
    </DreamAccountLayout>
  );
}
