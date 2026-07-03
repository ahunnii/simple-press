import { notFound, redirect } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { getSession } from "~/server/better-auth/server";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("customerAccounts")) notFound();

  const session = await getSession();

  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/account/settings");
  }
  return <>{children}</>;
}
