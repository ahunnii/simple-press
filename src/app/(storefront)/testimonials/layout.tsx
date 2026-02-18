import { notFound } from "next/navigation";

import { auth } from "~/server/better-auth";

export default async function CollectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const session = await auth.api.getSession();

  // if (!session?.user && session?.user.role !== "ADMIN") {
  //   notFound();
  // }

  return <div className="mx-auto max-w-7xl py-24 md:py-32">{children}</div>;
}
