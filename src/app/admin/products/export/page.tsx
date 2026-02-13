import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";

import { ProductExporter } from "../_components/product-exporter";

export default async function ProductExportPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      business: { select: { id: true, name: true } },
    },
  });

  if (!user?.business) {
    redirect("/admin/welcome");
  }

  return <ProductExporter business={user.business} />;
}
