import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { StorefrontFooter } from "~/app/(storefront)/_components/storefront-footer";
import { StorefrontHeader } from "~/app/(storefront)/_components/storefront-header";
import { DefaultProductCard } from "~/app/(storefront)/_templates/default/default-product-card";

type DefaultTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
  children: React.ReactNode;
};

export async function DefaultLayout({
  business,
  children,
}: DefaultTemplateProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontHeader business={business} />
      <main className="flex-1">{children}</main>
      <StorefrontFooter business={business} />
    </div>
  );
}
