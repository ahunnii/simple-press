import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { api } from "~/trpc/server";

import { ProductImportWizard } from "../_components/product-import-wizard";

export default async function ProductImportPage() {
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  return <ProductImportWizard business={business} />;
}
