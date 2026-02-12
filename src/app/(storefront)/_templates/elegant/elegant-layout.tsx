import type { RouterOutputs } from "~/trpc/react";

import { ElegantFooter } from "./elegant-footer";
import { ElegantHeader } from "./elegant-header";

export function ElegantLayout({
  business,
  children,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <ElegantHeader business={business} />
      {children}
      <ElegantFooter business={business} />
    </main>
  );
}
