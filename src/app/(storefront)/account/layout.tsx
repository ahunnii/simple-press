import { headers } from "next/headers";
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
    // Middleware exposes the requested path (incl. query string) via
    // x-pathname (see src/lib/require-admin-access.ts for the same
    // pattern). Carry the real path through so sign-in can return the user
    // to where they were, instead of always landing on /account/settings
    // regardless of whether they requested /account/orders, etc.
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") ?? "/account";
    redirect(`/auth/sign-in?redirectTo=${encodeURIComponent(pathname)}`);
  }
  return <>{children}</>;
}
