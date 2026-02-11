import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { CartProvider } from "~/providers/cart-context";

import { DefaultLayout } from "./_templates/default/default-layout";

type Props = {
  children: React.ReactNode;
};

export default async function StorefrontLayout({ children }: Props) {
  const business = await api.business.get();

  if (!business) {
    notFound();
  }
  const templateId = business.templateId;

  if (templateId === "default") {
    return (
      <DefaultLayout business={business}>
        <CartProvider>{children}</CartProvider>
      </DefaultLayout>
    );
  }

  return <CartProvider>{children}</CartProvider>;
}
