"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "~/components/ui/button";

type Props = {
  invoiceId: string;
};

/** Screen-only toolbar for the invoice print page — hidden when printing.
 *  Mirrors `admin/orders/[id]/_components/print-toolbar.tsx`, kept as its own
 *  copy rather than a shared import since that file belongs to the orders
 *  package and isn't meant to be touched here. */
export function PrintToolbar({ invoiceId }: Props) {
  return (
    <div className="bg-background flex items-center justify-between border-b px-4 py-3 print:hidden">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/invoices/${invoiceId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Invoice
        </Link>
      </Button>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
    </div>
  );
}
