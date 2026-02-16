import type { RouterOutputs } from "~/trpc/react";

import { PollenFooter } from "./pollen-footer";
import { PollenHeader } from "./pollen-header";

type Props = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  children: React.ReactNode;
};
export function PollenLayout({ business, children }: Props) {
  return (
    <main className="min-h-screen">
      <PollenHeader business={business} />
      {children}
      <PollenFooter business={business} />
    </main>
  );
}
