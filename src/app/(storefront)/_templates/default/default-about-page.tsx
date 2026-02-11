import type { RouterOutputs } from "~/trpc/react";

import { StorefrontFooter } from "../../_components/storefront-footer";
import { StorefrontHeader } from "../../_components/storefront-header";

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
};

export async function DefaultAboutPage({ business }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StorefrontHeader business={business} />

      <main className="flex-1 px-4 py-12">
        <h1>About</h1>
        <p>{business.siteContent?.aboutText}</p>
      </main>

      <StorefrontFooter business={business} />
    </div>
  );
}
