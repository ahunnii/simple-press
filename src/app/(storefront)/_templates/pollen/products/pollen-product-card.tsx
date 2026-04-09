"use client";

import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "~/lib/prices";
import { Button } from "~/components/ui/button";

type Props = {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    originalPrice: number | null;
    image: string;
    badge: string | null;
    category: string;
    slug: string;
  };
  index: number;
};

export function PollenProductCard({ product }: Props) {
  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-md border border-[#2a351f]/20 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-[#f5f2ee]">
        <Image
          src={product.image ?? "/placeholder.svg"}
          alt={product.name ?? "Product Image"}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-lg font-semibold text-[#2a351f] transition-colors group-hover:text-[#5e7747]">
            {product.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[#4c566a]">
            {product.description}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-xl font-bold text-[#215935]">
            {formatPrice(product.price)}
          </span>
          <Button size="sm" className="bg-[#215935] text-white hover:bg-[#1a4729]">
            View Product
          </Button>
        </div>
      </div>
    </Link>
  );
}
