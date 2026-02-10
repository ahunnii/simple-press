import Link from "next/link";

import { Button } from "~/components/ui/button";

import { ProductCard } from "../_components/product-card";
import { StorefrontFooter } from "../_components/storefront-footer";
import { StorefrontHeader } from "../_components/storefront-header";

type Business = {
  id: string;
  name: string;
  siteContent: {
    aboutTitle: string | null;
    heroTitle: string | null;
    heroSubtitle: string | null;
    aboutText: string | null;
    primaryColor: string | null;
  } | null;
  products: Array<{
    id: string;
    name: string;
    slug: string;
    price: number;
    images: Array<{ url: string; altText: string | null }>;
  }>;
};

type MinimalTemplateProps = {
  business: Business;
};

export function MinimalTemplate({ business }: MinimalTemplateProps) {
  const primaryColor = business.siteContent?.primaryColor ?? "#000000";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StorefrontHeader
        business={
          business as {
            name: string;
            siteContent: {
              logoUrl: string | null;
            } | null;
          }
        }
      />

      {/* Hero Section - Minimal Style */}
      <section className="relative border-b px-4 py-40">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-8 text-7xl font-light tracking-tight text-gray-900 md:text-8xl">
            {business.siteContent?.heroTitle ?? business.name}
          </h1>
          {business.siteContent?.heroSubtitle && (
            <p className="mb-12 text-xl font-light text-gray-500">
              {business.siteContent.heroSubtitle}
            </p>
          )}
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-none border-2"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <Link href="/products">Shop</Link>
          </Button>
        </div>
      </section>

      {/* Featured Products */}
      {business.products?.length > 0 && (
        <section className="px-4 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-px bg-gray-200 sm:grid-cols-2 md:grid-cols-3">
              {business.products?.map((product) => (
                <div key={product.id} className="bg-white">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      {business.siteContent?.aboutText && (
        <section className="border-t px-4 py-24">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-8 text-4xl font-light text-gray-900">About</h2>
            <p className="text-lg leading-relaxed font-light whitespace-pre-line text-gray-600">
              {business.siteContent.aboutText}
            </p>
          </div>
        </section>
      )}

      <StorefrontFooter
        business={
          business as {
            name: string;
            siteContent: {
              footerText: string | null;
            } | null;
          }
        }
      />
    </div>
  );
}
