import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "~/server/db";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function getBusinessFromHost() {
  const { headers: getHeaders } = await import("next/headers");
  const headers = await getHeaders();
  const host = headers.get("host") ?? "";

  const subdomain = host.split(".")[0];

  const business = await db.business.findUnique({
    where: { subdomain },
    select: {
      id: true,
      name: true,
      siteContent: {
        select: {
          primaryColor: true,
        },
      },
    },
  });

  return business;
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const business = await getBusinessFromHost();

  if (!business) {
    notFound();
  }

  // Get collection with products
  const collection = await db.collection.findUnique({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug,
      },
    },
    include: {
      collectionProducts: {
        include: {
          product: {
            include: {
              images: {
                orderBy: { sortOrder: "asc" },
                take: 1,
              },
              variants: true,
            },
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!collection || !collection.published) {
    notFound();
  }

  const products = collection.collectionProducts
    .map((cp) => cp.product)
    .filter((p) => p !== null);

  const primaryColor = business.siteContent?.primaryColor ?? "#3b82f6";

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Collection Header */}
      <div className="border-b bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {collection.imageUrl && (
            <div className="mb-6">
              <Image
                src={collection.imageUrl}
                alt={collection.name}
                width={1200}
                height={300}
                className="h-48 w-full rounded-lg object-cover"
              />
            </div>
          )}

          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            {collection.name}
          </h1>

          {collection.description && (
            <p className="max-w-3xl text-lg text-gray-600">
              {collection.description}
            </p>
          )}

          <p className="mt-4 text-sm text-gray-500">
            {products.length} {products.length === 1 ? "product" : "products"}
          </p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">No products in this collection yet.</p>
            <Link
              href="/products"
              className="mt-4 inline-block text-blue-600 hover:text-blue-700"
            >
              View all products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const image = product.images[0];
              const hasVariants = product.variants.length > 0;
              const basePrice = hasVariants
                ? (product.variants[0]?.price ?? product.price)
                : product.price;

              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group"
                >
                  <div className="overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-lg">
                    {/* Product Image */}
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      {image ? (
                        <Image
                          src={image.url}
                          alt={image.altText ?? product.name}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <h3 className="mb-1 line-clamp-2 font-semibold text-gray-900">
                        {product.name}
                      </h3>

                      <div className="flex items-baseline gap-2">
                        <p
                          className="text-lg font-bold"
                          style={{ color: primaryColor }}
                        >
                          {formatPrice(basePrice)}
                        </p>
                        {product.compareAtPrice &&
                          product.compareAtPrice > basePrice && (
                            <p className="text-sm text-gray-500 line-through">
                              {formatPrice(product.compareAtPrice)}
                            </p>
                          )}
                      </div>

                      {hasVariants && (
                        <p className="mt-1 text-xs text-gray-500">
                          {product.variants.length} variants available
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const business = await getBusinessFromHost();

  if (!business) {
    return {
      title: "Collection Not Found",
    };
  }

  const collection = await db.collection.findUnique({
    where: {
      businessId_slug: {
        businessId: business.id,
        slug,
      },
    },
    select: {
      name: true,
      description: true,
      metaTitle: true,
      metaDescription: true,
    },
  });

  if (!collection) {
    return {
      title: "Collection Not Found",
    };
  }

  return {
    title: collection.metaTitle ?? `${collection.name} | ${business.name}`,
    description:
      collection.metaDescription ??
      collection.description ??
      `Shop ${collection.name} at ${business.name}`,
  };
}
