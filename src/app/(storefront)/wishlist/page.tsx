import { notFound } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";

import { WishlistPageClient } from "../_components/wishlist/wishlist-page-client";

export const metadata = {
  title: "Wishlist",
  robots: { index: false, follow: false },
};

/**
 * Neutral, template-agnostic wishlist page (same precedent as /order-status).
 * All wishlist data lives in localStorage, so the body is a client component;
 * the server shell only resolves the tenant.
 */
export default async function WishlistPage() {
  const business = await checkBusiness();
  if (!business) notFound();

  return <WishlistPageClient />;
}
