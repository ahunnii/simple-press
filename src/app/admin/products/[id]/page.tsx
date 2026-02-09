import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { ProductForm } from "../_components/product-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;

  // Get session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  // Get user's business
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { businessId: true },
  });

  if (!user?.businessId) {
    redirect("/admin/welcome");
  }

  // Get product
  const product = await db.product.findFirst({
    where: {
      id,
      businessId: user.businessId,
    },
    include: {
      variants: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          <p className="mt-1 text-gray-600">Update product details</p>
        </div>

        <ProductForm
          businessId={user.businessId}
          product={
            product as unknown as {
              id: string;
              name: string;
              slug: string;
              description: string | null;
              price: number;
              published: boolean;
            }
          }
        />
      </div>
    </div>
  );
}
