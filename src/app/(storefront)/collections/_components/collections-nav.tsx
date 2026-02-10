"use client";

import Link from "next/link";
import { api } from "~/trpc/react";

type CollectionsNavProps = {
  businessId: string;
  primaryColor?: string;
};

export function CollectionsNav({
  businessId,
  primaryColor = "#3b82f6",
}: CollectionsNavProps) {
  const { data: collections } = api.collections.getByBusiness.useQuery({
    businessId,
    includeUnpublished: false,
  });

  if (!collections || collections.length === 0) {
    return null;
  }

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6 overflow-x-auto py-3">
          <Link
            href="/products"
            className="text-sm font-medium whitespace-nowrap text-gray-700 hover:text-gray-900"
          >
            All Products
          </Link>
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.slug}`}
              className="text-sm font-medium whitespace-nowrap text-gray-700 hover:text-gray-900"
              style={{
                color: undefined,
              }}
            >
              {collection.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
