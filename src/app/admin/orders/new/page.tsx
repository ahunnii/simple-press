import { redirect } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";

import { api } from "~/trpc/server";
import { ManualOrderForm } from "../_components/manual-order-form";

export default async function NewOrderPage() {
  const business = await checkBusiness();

  if (!business) {
    redirect("/admin/welcome");
  }
  const products = await api.product.secureGetAll();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Create Manual Order
          </h1>
          <p className="mt-1 text-gray-600">
            Create an order manually (phone, in-person, etc.)
          </p>
        </div>

        <ManualOrderForm businessId={business?.id} products={products} />
      </div>
    </div>
  );
}
