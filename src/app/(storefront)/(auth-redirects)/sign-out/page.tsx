import { notFound, redirect } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";

export default async function SignOutPage() {
  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("customerAccounts")) notFound();

  redirect("/auth/sign-out");
}
