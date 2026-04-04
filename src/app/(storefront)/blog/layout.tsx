import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";

type Props = {
  children: React.ReactNode;
};
export default async function BlogLayout({ children }: Props) {
  const { isEnabled } = await getBusinessFlags();

  if (!isEnabled("blog")) {
    notFound();
  }

  return <>{children}</>;
}
