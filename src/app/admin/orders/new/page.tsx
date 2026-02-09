import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "~/lib/auth";
import { prisma } from "~/server/db";
import { ManualOrderForm } from "../_components/manual-order-form";

export default async function NewOrderPage() {
  // Get session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  // Get user's business
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { businessId: true },
  });

  if (!user?.businessId) {
    redirect("/admin/welcome");
  }

  // Get products for selection
  const products = await prisma.product.findMany({
    where: { businessId: user.businessId },
    include: {
      variants: true,
    },
    orderBy: { name: "asc" },
  });

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

        <ManualOrderForm businessId={user.businessId} products={products} />
      </div>
    </div>
  );
}
