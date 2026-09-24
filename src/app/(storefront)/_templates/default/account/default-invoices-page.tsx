import type { InvoicesPageTemplateProps } from "../../types";
import { InvoicesContent } from "~/app/(storefront)/_components/account/invoices-content";

import { DefaultAccountLayout } from "./default-account-layout";

export function DefaultInvoicesPage({ invoices }: InvoicesPageTemplateProps) {
  return (
    <DefaultAccountLayout heading="Invoices">
      <InvoicesContent invoices={invoices} />
    </DefaultAccountLayout>
  );
}
