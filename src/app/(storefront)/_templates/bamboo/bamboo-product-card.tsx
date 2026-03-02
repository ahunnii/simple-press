"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

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

export function BambooProductCard({ product }: Props) {
  //   const { addItem } = useCart()

  //   const handleAdd = (e: React.MouseEvent) => {
  //     e.preventDefault()
  //     e.stopPropagation()
  //     addItem(product)
  //     toast.success(`${product.name} added to cart`)
  //   }

  const router = useRouter();
  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group border-border bg-card flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-lg"
    >
      <div className="bg-secondary relative aspect-square overflow-hidden">
        <Image
          src={product.image ?? "/placeholder.svg"}
          alt={product.name ?? "Product Image"}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {/* {product.badge && (
          <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
            {product.badge}
          </Badge>
        )} */}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="text-card-foreground group-hover:text-primary font-heading text-lg font-semibold transition-colors">
            {product.name}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            {product.description.slice(0, 100)}...
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* {product.features.map((feature) => (
            <span
              key={feature}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
            >
              {feature}
            </span>
          ))} */}
        </div>
        <div className="mt-auto flex items-center justify-between gap-4 pt-2">
          <span className="text-foreground text-xl font-bold">
            {formatPrice(product.price)}
          </span>
          <Button
            onClick={() => router.push(`/shop/${product.slug}`)}
            className="gap-2"
          >
            <Eye className="size-4" />
            View Product
          </Button>
        </div>
      </div>
    </Link>
  );
}
