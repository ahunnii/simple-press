import { notFound } from "next/navigation";

import { auth } from "~/server/better-auth";

type Props = {
  children: React.ReactNode;
};
export default async function V1Layout({ children }: Props) {
  const session = await auth.api.getSession();

  if (!session) notFound();
  if (session.user.role !== "ADMIN") notFound();

  return <>{children}</>;
}
