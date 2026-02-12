import { notFound } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";
import { CartProvider } from "~/providers/cart-context";

import { DefaultLayout } from "./_templates/default/default-layout";
import { ElegantLayout } from "./_templates/elegant/elegant-layout";
import { ModernLayout } from "./_templates/modern/modern-layout";

type Props = {
  children: React.ReactNode;
};

export default async function StorefrontLayout({ children }: Props) {
  const business = await api.business.simplifiedGet();

  if (!business) {
    notFound();
  }

  const TemplateLayout =
    {
      default: DefaultLayout,
      elegant: ElegantLayout,
      modern: ModernLayout,
    }[business.templateId] ?? DefaultLayout;

  return (
    <HydrateClient>
      <TemplateLayout business={business}>
        <>{children}</>
      </TemplateLayout>
    </HydrateClient>
  );
}
