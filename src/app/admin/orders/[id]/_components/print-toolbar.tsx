"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

import { Button } from "~/components/ui/button";

type Props = {
  orderId: string;
};

/** Screen-only toolbar for print document pages — hidden when printing. */
export function PrintToolbar({ orderId }: Props) {
  return (
    <div className="bg-background flex items-center justify-between border-b px-4 py-3 print:hidden">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/orders/${orderId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Order
        </Link>
      </Button>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
    </div>
  );
}
