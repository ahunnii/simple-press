"use client";

import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";
import { PageTransition } from "~/components/page-animations";

import { NoiseAccountLayout } from "./noise-account-layout";

export function NoiseInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <PageTransition>
      <NoiseAccountLayout heading="Invoices">
        <InvoicesContent invoices={invoices} />
      </NoiseAccountLayout>
    </PageTransition>
  );
}
