import Link from "next/link";

import type { DefaultHomepageTemplateProps } from "./types";
import { Button } from "~/components/ui/button";

import { DefaultFooter } from "./default/default-footer";
import { DefaultHeader } from "./default/default-header";
import { DefaultProductCard } from "./default/default-product-card";

export function MinimalTemplate({ business }: DefaultHomepageTemplateProps) {
  const primaryColor = business.siteContent?.primaryColor ?? "#000000";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <DefaultHeader business={business} />

      {/* Hero Section - Minimal Style */}
      <section className="relative border-b px-4 py-40">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-8 text-7xl font-light tracking-tight text-gray-900 md:text-8xl">
            {business.name}
          </h1>

          <p className="mb-12 text-xl font-light text-gray-500">
            Subtitle here
          </p>

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
                  <DefaultProductCard product={product} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Section */}

      <section className="border-t px-4 py-24">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-4xl font-light text-gray-900">About</h2>
          <p className="text-lg leading-relaxed font-light whitespace-pre-line text-gray-600">
            Something about the business
          </p>
        </div>
      </section>

      <DefaultFooter business={business} />
    </div>
  );
}
