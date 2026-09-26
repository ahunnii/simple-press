"use client";

import { FileText } from "lucide-react";

import type { InvoicesPageTemplateProps } from "../../types";
import { PageTransition } from "~/components/page-animations";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";

import { NoiseAccountLayout } from "./noise-account-layout";

export function NoiseInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <PageTransition>
      <NoiseAccountLayout heading="Invoices">
        {/* The shared list has no styling hooks, so noise renders its own
            empty state (matching orders/subscriptions) and hands real
            invoices to the shared component. */}
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
            <div
              className="border-foreground/20 flex items-center justify-center border-2"
              style={{ width: "64px", height: "64px" }}
            >
              <FileText
                className="size-6"
                style={{ color: "var(--vn-steel-mist)" }}
                aria-hidden="true"
              />
            </div>
            <div>
              <h2
                className="font-serif leading-none font-normal italic"
                style={{ fontSize: "28px", letterSpacing: "-0.01em" }}
              >
                No invoices yet.
              </h2>
              <p
                className="mt-2 font-sans text-sm"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Invoices from this business will show up here once one is sent
                to you.
              </p>
            </div>
          </div>
        ) : (
          <InvoicesContent invoices={invoices} />
        )}
      </NoiseAccountLayout>
    </PageTransition>
  );
}
