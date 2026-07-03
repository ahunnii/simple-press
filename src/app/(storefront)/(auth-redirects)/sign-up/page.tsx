import { notFound, redirect } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";

export default async function SignUpPage() {
  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("customerAccounts")) notFound();

  redirect("/auth/sign-up");
}
