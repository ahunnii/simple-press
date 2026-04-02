import { notFound, redirect } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";
import { db } from "~/server/db";
import { api } from "~/trpc/server";

import { DiscountForm } from "../_components/discount-form";
import { TrailHeader } from "../../_components/trail-header";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditDiscountPage({ params }: PageProps) {
  const { id } = await params;

  const discount = await api.discount.getById({ id });
  if (!discount) {
    notFound();
  }

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Discounts", href: "/admin/discounts" },
          { label: discount.code },
        ]}
      />

      <DiscountForm initialDiscount={discount} />
    </>
  );
}
