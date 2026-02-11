"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "~/components/ui/button";

export function RefreshButton() {
  return (
    <Button
      size="lg"
      variant="outline"
      className="gap-2"
      onClick={() => window.location.reload()}
    >
      <RefreshCw className="size-4 shrink-0" aria-hidden />
      Try again
    </Button>
  );
}
