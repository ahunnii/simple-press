import type { RouterOutputs } from "~/trpc/react";

import { ModernFooter } from "./modern-footer";
import { ModernHeader } from "./modern-header";

export function ModernLayout({
  business,
  children,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen font-sans antialiased">
      <ModernHeader business={business} />
      {children}
      <ModernFooter business={business} />
    </main>
  );
}
