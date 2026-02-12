import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { StorefrontFooter } from "~/app/(storefront)/_components/storefront-footer";
import { StorefrontHeader } from "~/app/(storefront)/_components/storefront-header";
import { DefaultProductCard } from "~/app/(storefront)/_templates/default/default-product-card";

import { DefaultFooter } from "./default-footer";
import { DefaultHeader } from "./default-header";

type DefaultTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>;
  children: React.ReactNode;
};

export async function DefaultLayout({
  business,
  children,
}: DefaultTemplateProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <DefaultHeader business={business} />
      <main className="flex-1">{children}</main>
      <DefaultFooter business={business} />
    </div>
  );
}
