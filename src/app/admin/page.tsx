import { redirect } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";

export default async function AdminPage() {
  const business = await checkBusiness();

  if (!business?.customDomain) {
    redirect("/admin/welcome");
  }

  redirect("/admin/dashboard");
}
