import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";

type Props = {
  children: React.ReactNode;
};
export default async function OrdersLayout({ children }: Props) {
  const { isEnabled } = await getBusinessFlags();

  if (!isEnabled("orders")) {
    notFound();
  }

  return <>{children}</>;
}
