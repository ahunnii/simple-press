import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "~/server/db";
import { StorefrontFooter } from "../../_components/storefront-footer";
import { StorefrontHeader } from "../../_components/storefront-header";
import { ProductDetails } from "../_components/product-details";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const headersList = await headers();
  const hostname = headersList.get("host") ?? "";
  const domain = hostname.split(":")[0];

  // Find business
  const business = await db.business.findFirst({
    where: {
      OR: [{ customDomain: domain }, { subdomain: domain?.split(".")[0] }],
      status: "active",
    },
    include: {
      siteContent: true,
    },
  });

  if (!business) {
    notFound();
  }

  // Find product
  const product = await db.product.findFirst({
    where: {
      slug,
      businessId: business.id,
      published: true,
    },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
      },
      variants: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StorefrontHeader business={business} />

      <main className="flex-1 px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <ProductDetails
            product={
              product as unknown as {
                id: string;
                name: string;
                description: string | null;
                price: number;
                images: Array<{ url: string; altText: string | null }>;
                variants: Array<{
                  id: string;
                  name: string;
                  price: number | null;
                  inventoryQty: number;
                  options: Record<string, string>;
                }>;
              }
            }
            business={business}
          />
        </div>
      </main>

      <StorefrontFooter business={business} />
    </div>
  );
}
