import Image from "next/image";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { StorefrontFooter } from "~/app/(storefront)/_components/storefront-footer";
import { StorefrontHeader } from "~/app/(storefront)/_components/storefront-header";
import { DefaultProductCard } from "~/app/(storefront)/_templates/default/default-product-card";

type DefaultTemplateProps = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
};

export function DefaultTemplate({ business }: DefaultTemplateProps) {
  const primaryColor = business.siteContent?.primaryColor ?? "#3b82f6";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StorefrontHeader business={business} />

      {/* Hero Section */}
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
      {business?.products?.length > 0 && (
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
      )}

      {/* About Section */}
      {business.siteContent?.aboutText && (
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
      )}

      <StorefrontFooter business={business} />
    </div>
  );
}
