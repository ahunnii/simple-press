import type { RouterOutputs } from "~/trpc/react";

import { DarkTrendFooter } from "./dark-trend-footer";
import { DarkTrendHeader } from "./dark-trend-header";

export function DarkTrendLayout({
  business,
  children,
}: {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#1A1A1A] font-sans text-white antialiased">
      <DarkTrendHeader business={business} />
      {children}
      <DarkTrendFooter business={business} />
    </main>
  );
}
