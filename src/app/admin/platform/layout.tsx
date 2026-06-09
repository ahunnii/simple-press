import { redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";

type Props = {
  children: React.ReactNode;
};

export default async function PlatformAdminLayout({ children }: Props) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/admin/platform");
  }

  if (session.user.platformRole !== "PLATFORM_ADMIN") {
    redirect("/not-permitted");
  }

  return <>{children}</>;
}
