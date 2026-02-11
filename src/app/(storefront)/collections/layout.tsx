import { notFound } from "next/navigation";

import { auth } from "~/server/better-auth";

export default async function CollectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession();

  if (!session?.user && session?.user.role !== "ADMIN") {
    notFound();
  }

  return <div>{children}</div>;
}
