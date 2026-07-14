import { headers } from "next/headers";

import { getBusinessUrl } from "~/lib/business-url";
import { businessHostFilter } from "~/lib/domain-utils";
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
 *
 * Paginated: `?limit=` (default 50, max 100) and `?offset=` (default 0) cap the
 * payload so a large catalog can't be dumped in a single unbounded response.
 */
export async function GET(request: Request) {
  const headersList = await headers();
  const hostname = headersList.get("host") ?? "";

  const { searchParams } = new URL(request.url);
  const DEFAULT_LIMIT = 50;
  const MAX_LIMIT = 100;
  const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;
  const parsedOffset = Number.parseInt(searchParams.get("offset") ?? "", 10);
  const offset =
    Number.isFinite(parsedOffset) && parsedOffset > 0 ? parsedOffset : 0;

  const business = await db.business.findFirst({
    where: {
      ...businessHostFilter(hostname),
      status: "active",
    },
    select: {
      name: true,
      subdomain: true,
      customDomain: true,
      domainStatus: true,
      _count: {
        select: { products: { where: { published: true } } },
      },
      products: {
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
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

  const total = business._count.products;

  return Response.json(
    {
      business: business.name,
      products,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + products.length < total,
      },
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
