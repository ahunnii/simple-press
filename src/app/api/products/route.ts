import { headers } from "next/headers";

import { getBusinessUrl } from "~/lib/business-url";
import { formatPrice } from "~/lib/prices";
import { db } from "~/server/db";

/**
 * Public per-business product feed.
 *
 * Resolved by request host: each tenant lives on its own subdomain or custom
 * domain, so `GET https://{shop}/api/products` returns that shop's catalog.
 *
 * Returns published products only, each with name, price (cents + formatted),
 * description, the storefront URL where it can be purchased, and an image URL.
 */
export async function GET() {
  const headersList = await headers();
  const hostname = headersList.get("host") ?? "";
  const domain = hostname.split(":")[0]; // strip port

  const business = await db.business.findFirst({
    where: {
      OR: [{ customDomain: domain }, { subdomain: domain?.split(".")[0] }],
      status: "active",
    },
    select: {
      name: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
      products: {
        where: { published: true },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          description: true,
          excerpt: true,
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  });

  if (!business) {
    return Response.json({ error: "Business not found" }, { status: 404 });
  }

  const baseUrl = getBusinessUrl({
    subdomain: business.subdomain,
    customDomain: business.customDomain,
    domainStatus: business.domainStatus,
  });

  const products = business.products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    priceFormatted: formatPrice(product.price),
    currency: "USD",
    description: product.description ?? product.excerpt ?? null,
    url: `${baseUrl}/shop/${product.slug}`,
    imageUrl: product.images[0]?.url ?? null,
  }));

  return Response.json(
    { business: business.name, products },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
