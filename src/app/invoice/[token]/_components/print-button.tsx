"use client";

import { Printer } from "lucide-react";

import { Button } from "~/components/ui/button";

/** Screen-only "Print / Save as PDF" trigger — hidden in the print stylesheet. */
export function PrintButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5 print:hidden"
      onClick={() => window.print()}
    >
      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
      Print / Save as PDF
    </Button>
  );
}
