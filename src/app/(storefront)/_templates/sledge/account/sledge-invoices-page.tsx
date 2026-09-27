"use client";

import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";
import { PageTransition } from "~/components/page-animations";

import { SledgeAccountLayout } from "./sledge-account-layout";

export function SledgeInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <PageTransition className="bg-white">
      <SledgeAccountLayout heading="Invoices">
        <InvoicesContent invoices={invoices} />
      </SledgeAccountLayout>
    </PageTransition>
  );
}
