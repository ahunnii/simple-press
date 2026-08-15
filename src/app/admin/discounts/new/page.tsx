import { DiscountForm } from "../_components/discount-form";
import { TrailHeader } from "../../_components/trail-header";

export default async function NewDiscountPage() {
  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Discounts", href: "/admin/discounts" },
          { label: "New Discount Code" },
        ]}
      />

      <DiscountForm />
    </>
  );
}

export const metadata = {
  title: "Create Discount Code",
};
