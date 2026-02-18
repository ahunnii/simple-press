import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import type { DefaultProductPageTemplateProps } from "../types";

import { ModernProductActions } from "./modern-product-actions";

export async function ModernProductPage({
  product,
}: DefaultProductPageTemplateProps) {
  //   const related = products
  //     .filter((p) => p.category === product.category && p.id !== product.id)
  //     .slice(0, 4);

  const related = [];
  return (
    <div className="bg-background">
      {/* Breadcrumb */}
      <div className="border-border border-b">
        <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
          <Link
            href="/shop"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shop
          </Link>
        </div>
      </div>

      {/* Product Detail */}
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Product Image */}
          <div className="bg-muted relative aspect-square overflow-hidden rounded-sm">
            <Image
              src={product.images[0]?.url ?? "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center">
            {/* <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                {product.category}
              </p> */}
            <h1 className="text-foreground mt-2 font-serif text-3xl md:text-4xl">
              {product.name}
            </h1>
            <p className="text-foreground mt-4 text-2xl font-light">
              ${product.price}
            </p>

            <p className="text-muted-foreground mt-6 leading-relaxed">
              {product.description}
            </p>

            <ModernProductActions product={product} />

            {/* Details */}
            {/* <div className="border-border mt-10 border-t pt-8">
                <h3 className="text-foreground text-xs font-semibold tracking-widest uppercase">
                  Details
                </h3>
                <ul className="mt-4 flex flex-col gap-2">
                  {product.details.map((detail) => (
                    <li
                      key={detail}
                      className="text-muted-foreground flex items-start gap-2 text-sm"
                    >
                      <span className="bg-accent mt-1.5 h-1 w-1 flex-shrink-0 rounded-full" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div> */}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="border-border bg-secondary border-t">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
            <h2 className="text-foreground font-serif text-2xl md:text-3xl">
              You may also like
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <p>No related products</p>
              {/* {related.map((p) => (
                <ModernProductCard key={p.id} product={p} />
              ))} */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
