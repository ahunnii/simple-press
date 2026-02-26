import { notFound } from "next/navigation";

import { auth } from "~/server/better-auth";
import { api } from "~/trpc/server";

export default async function CollectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();
  if (business.templateId !== "pollen") {
    notFound();
  }

  // const session = await auth.api.getSession();

  // if (!session?.user && session?.user.role !== "ADMIN") {
  //   notFound();
  // }

  return <div className="mx-auto max-w-7xl py-24 md:py-32">{children}</div>;
}
