import { redirect } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";

import { DiscountForm } from "../_components/discount-form";

export default async function NewDiscountPage() {
  const business = await checkBusiness();

  if (!business) {
    redirect("/admin/welcome");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Create Discount Code
          </h1>
          <p className="mt-1 text-gray-600">
            Set up a new discount code for your customers
          </p>
        </div>

        <DiscountForm businessId={business.id} />
      </div>
    </div>
  );
}
