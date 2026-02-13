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
    <main className="min-h-screen bg-zinc-950 font-sans antialiased text-white">
      <DarkTrendHeader business={business} />
      {children}
      <DarkTrendFooter business={business} />
    </main>
  );
}
