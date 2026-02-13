"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

import { api } from "~/trpc/react";

const cardTransition = {
  duration: 0.45,
  ease: [0.25, 0.46, 0.45, 0.94],
} as const;

export function DarkTrendFeaturedProductsGrid() {
  const { data: products } = api.product.getFeatured.useQuery();
  const displayProducts = products?.slice(0, 3) ?? [];

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {displayProducts.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ ...cardTransition, delay: index * 0.1 }}
        >
          <Link
            href={`/shop/${product.slug}`}
            className="group block"
          >
            <motion.div
              className="relative aspect-square overflow-hidden rounded-sm bg-zinc-800"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.25 }}
            >
              <Image
                src={product.images[0]?.url ?? "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </motion.div>
            <h3 className="mt-4 text-base font-medium text-white">
              {product.name}
            </h3>
            <p className="mt-1 text-sm text-white/80">
              ${Number(product.price).toFixed(2)}
            </p>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
