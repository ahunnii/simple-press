"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
import { Button } from "~/components/ui/button";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { useCart } from "~/providers/cart-context";

import {
  HappyBambooFeaturedProductCard,
  HappyBambooHorizontalProductCard,
} from "../products/happy-bamboo-product-card";

type Props = {
  featuredProducts: NonNullable<
    RouterOutputs["business"]["getHomepage"]
  >["products"];
  featuredTitle?: string;
  featuredDescription?: string;
  featuredButtonText?: string;
  featuredButtonLink?: string;
};
export function HappyBambooFeaturedProducts({
  featuredProducts,
  featuredTitle = "Our Curated Collection",
  featuredDescription = "Every product is 100% bamboo, tree-free, and crafted to the highest standard. No compromises.",
  featuredButtonText = "View All Products",
  featuredButtonLink = "/shop",
}: Props) {
  const { addItem } = useCart();
  const router = useRouter();

  const handleAdd = (
    e: React.MouseEvent,
    product: NonNullable<
      RouterOutputs["business"]["getHomepage"]
    >["products"][number],
  ) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product.id,
      variantId: null,
      productName: product.name,
      variantName: null,
      price: product.price,
      imageUrl: product.images[0]?.url ?? "/placeholder.svg",
      sku: null,
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 lg:px-8">
      <FadeIn direction="up">
        <div className="mb-12 space-y-6 text-center">
          <span className="text-primary text-sm font-semibold tracking-wider uppercase">
            Happy Bamboo
          </span>
          <h2 className="text-foreground font-serif text-4xl font-bold tracking-tight md:text-5xl">
            <span className="text-balance">{featuredTitle}</span>
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-2xl">
            {featuredDescription}
          </p>
        </div>
      </FadeIn>
      <StaggerContainer
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2"
        staggerDelay={0.12}
      >
        {featuredProducts?.slice(0, 3).map((product) => (
          <StaggerItem key={product.id}>
            <HappyBambooFeaturedProductCard product={product} />
          </StaggerItem>
        ))}
      </StaggerContainer>
      <FadeIn direction="up" delay={0.3}>
        <div className="mt-12 text-center">
          <Button size="lg" asChild>
            <Link href={featuredButtonLink ?? "/shop"}>
              {featuredButtonText}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </FadeIn>
    </section>
  );
}
