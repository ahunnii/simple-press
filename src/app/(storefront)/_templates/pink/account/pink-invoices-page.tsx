"use client";

import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";
import { PageTransition } from "~/components/page-animations";

import { PinkEmptyState } from "../shared/pink-empty-state";
import { PinkAccountLayout } from "./pink-account-layout";

export function PinkInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <PageTransition>
      <PinkAccountLayout
        title="Invoices"
        description="Invoices this business has sent you."
      >
        {/* The shared list has no styling hooks, so pink renders its own
            empty state (matching orders/subscriptions) and hands real
            invoices to the shared component. */}
        {invoices.length === 0 ? (
          <PinkEmptyState
            heading="No invoices yet"
            body="Invoices from this business will show up here once one is sent to you."
          />
        ) : (
          <InvoicesContent invoices={invoices} />
        )}
      </PinkAccountLayout>
    </PageTransition>
  );
}
