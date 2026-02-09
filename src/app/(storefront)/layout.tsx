import { notFound } from "next/navigation";
import { CartProvider } from "~/providers/cart-context";
import { api } from "~/trpc/server";

type Props = {
  children: React.ReactNode;
};

export default async function StorefrontLayout({ children }: Props) {
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  return <CartProvider>{children}</CartProvider>;
}
