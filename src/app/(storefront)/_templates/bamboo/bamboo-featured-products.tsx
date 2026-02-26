"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import { useCart } from "~/providers/cart-context";

import { StaggerContainer, StaggerItem } from "./bamboo-animations";

export function BambooFeaturedProducts() {
  const { addItem } = useCart();
  const router = useRouter();
  const { data: featuredProducts } = api.product.getFeatured.useQuery();

  //   const handleAdd = (
  //     e: React.MouseEvent,
  //     product: NonNullable<RouterOutputs["product"]["getFeatured"]>[number],
  //   ) => {
  //     e.preventDefault();
  //     e.stopPropagation();
  //     addItem(product);
  //     toast.success(`${product.name ?? "Product"} added to cart`);
  //   };

  return (
    <StaggerContainer
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      staggerDelay={0.12}
    >
      {featuredProducts?.slice(0, 3).map((product) => (
        <StaggerItem key={product.id}>
          <Link
            href={`/shop/${product.id}`}
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
              {/* {product.badge && (
                <Badge className="bg-primary text-primary-foreground absolute top-3 left-3">
                  {product.badge}
                </Badge>
              )} */}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-5">
              <h3 className="text-card-foreground group-hover:text-primary font-serif text-lg font-semibold transition-colors">
                {product.name}
              </h3>
              <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
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
                  //   onClick={(e) => handleAdd(e, product)}
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
