"use client";

import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";
import { PageTransition } from "~/components/page-animations";

import { BambooAccountLayout } from "./bamboo-account-layout";

export function BambooInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <PageTransition>
      <BambooAccountLayout
        heading="Invoices"
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Account", href: "/account/settings" },
          { label: "Invoices" },
        ]}
      >
        <InvoicesContent invoices={invoices} />
      </BambooAccountLayout>
    </PageTransition>
  );
}
