"use client";

import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";

import { HappyBambooAccountLayout } from "./happy-bamboo-account-layout";

export function HappyBambooInvoicesPage({
  invoices,
}: InvoicesPageTemplateProps) {
  return (
    <HappyBambooAccountLayout
      heading="Invoices"
      breadcrumb={[
        { label: "Home", href: "/" },
        { label: "Account", href: "/account/settings" },
        { label: "Invoices" },
      ]}
    >
      <InvoicesContent invoices={invoices} />
    </HappyBambooAccountLayout>
  );
}
