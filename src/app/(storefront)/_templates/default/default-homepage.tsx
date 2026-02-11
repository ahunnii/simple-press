"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge, Eye, ShoppingCart } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { DefaultProductCard } from "~/app/(storefront)/_templates/default/default-product-card";

import { QuickAddButton } from "./default-quick-add-product";

type DefaultTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
};

export function DefaultHomePage({ business }: DefaultTemplateProps) {
  const primaryColor = business.siteContent?.primaryColor ?? "#3b82f6";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: featuredProducts } = api.product.getFeatured.useQuery();

  return (
    <>
      {/* Hero Section
      <section
        className="relative px-4 py-24"
        style={{ backgroundColor: `${primaryColor}15` }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h1 className="mb-6 text-5xl font-bold text-gray-900 md:text-6xl">
              {business.siteContent?.heroTitle ?? `Welcome to ${business.name}`}
            </h1>
            {business.siteContent?.heroSubtitle && (
              <p className="mb-8 text-xl text-gray-600">
                {business.siteContent.heroSubtitle}
              </p>
            )}
            <Button
              asChild
              size="lg"
              style={{ backgroundColor: primaryColor }}
              className="text-white hover:opacity-90"
            >
              <Link href="/products">Shop Now</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {/* {business?.products?.length > 0 && (
        <section className="px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-gray-900">
                Featured Products
              </h2>
              <Button asChild variant="outline">
                <Link href="/products">View All</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {business?.products?.map((product) => (
                <DefaultProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )} */}

      {/* About Section */}
      {/* {business.siteContent?.aboutText && (
        <section className="bg-gray-50 px-4 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-6 text-3xl font-bold text-gray-900">
              {business.siteContent.aboutTitle ?? "About Us"}
            </h2>
            <p className="text-lg whitespace-pre-line text-gray-600">
              {business.siteContent.aboutText}
            </p>
          </div>
        </section>
      )} */}

      <>
        {/* Hero Banner */}
        <section className="relative">
          <div className="container mx-auto px-4 py-12 md:px-6 md:py-24 lg:py-32">
            <div className="grid items-center gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                  {business.siteContent?.heroTitle ??
                    `Welcome to ${business.name}`}
                </h1>
                <p className="text-muted-foreground max-w-[600px] md:text-xl">
                  {business.siteContent?.heroSubtitle ?? "Take a look around!"}
                </p>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button size="lg" className="font-medium" asChild>
                    <Link href="/products">Shop Now</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="font-medium">
                    View Deals
                  </Button>
                </div>
              </div>
              <div className="relative h-[300px] overflow-hidden rounded-xl sm:h-[400px] lg:h-[500px]">
                <Image
                  src={business.siteContent?.heroImageUrl ?? "/placeholder.svg"}
                  alt={business.name ?? "Hero Image"}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="mx-auto py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="mb-8 text-center text-2xl font-bold tracking-tight md:text-3xl">
              Featured Products
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts?.map((product) => (
                <div key={product.id} className="group relative">
                  <div className="bg-background aspect-square overflow-hidden rounded-lg">
                    <Image
                      src={product.images[0]?.url ?? "/placeholder.svg"}
                      alt={
                        product.images[0]?.altText ??
                        product.name ??
                        "Product Image"
                      }
                      width={300}
                      height={300}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Quick view</span>
                      </Button>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      {product?.variants?.length > 0 ? (
                        <QuickAddButton product={product} />
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 space-y-1 text-center">
                    {/* <Badge variant="outline" className="mb-2">
                      {product.category}
                    </Badge> */}
                    <h3 className="font-medium">{product.name}</h3>
                    <div className="flex justify-center gap-2">
                      <span className="text-muted-foreground">
                        ${(product.price / 100).toFixed(2)}
                      </span>
                      {/* <span className="text-primary font-medium">
                        ${product.offerPrice.toFixed(2)}
                      </span> */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button variant="outline" size="lg" asChild>
                <Link href="/shop">View All Products</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-primary text-primary-foreground mx-auto py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center md:space-y-6">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                {business.siteContent?.aboutTitle ?? "About Us"}
              </h2>
              <p className="text-primary-foreground/90 max-w-[600px] md:text-lg">
                {
                  "Learn more about our mission, values, and what makes us unique. We are dedicated to providing the best experience for our customers."
                }
              </p>
              {/* You can add more generic CTA or about content here */}
            </div>
          </div>
        </section>
      </>
    </>
  );
}
