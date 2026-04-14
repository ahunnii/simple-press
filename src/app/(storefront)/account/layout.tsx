import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/account/settings");
  }
  return <>{children}</>;
}
