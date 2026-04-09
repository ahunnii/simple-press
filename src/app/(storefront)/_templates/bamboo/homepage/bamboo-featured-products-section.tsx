"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
import { Button } from "~/components/ui/button";
import { StaggerContainer, StaggerItem } from "~/components/page-animations";

type Props = {
  featuredProducts: NonNullable<
    RouterOutputs["business"]["getHomepage"]
  >["products"];
};
export function BambooFeaturedProductsSection({ featuredProducts }: Props) {
  const router = useRouter();

  return (
    <StaggerContainer
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      staggerDelay={0.12}
    >
      {featuredProducts?.slice(0, 3).map((product) => (
        <StaggerItem key={product.id}>
          <Link
            href={`/shop/${product.slug}`}
            className="group border-border bg-card relative flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-lg"
          >
            <div className="bg-secondary relative aspect-square overflow-hidden">
              <Image
                src={product.images[0]?.url ?? "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <h3 className="text-card-foreground group-hover:text-primary font-heading text-lg font-semibold transition-colors">
                {product.name}
              </h3>
              <p className="text-muted-foreground line-clamp-2 flex-1 text-sm leading-relaxed">
                {product.description}
              </p>
              <div className="flex items-center justify-between gap-4">
                <span className="text-foreground text-lg font-bold">
                  {formatPrice(product.price)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => router.push(`/shop/${product.slug}`)}
                >
                  <Eye className="size-4" />
                  View Product
                </Button>
              </div>
            </div>
          </Link>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}

//TODO: Add ability to quick add to cart, especially if product doesn't have variants
