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
type VintageTemplateProps = {
  business: Business;
};

export function VintageTemplate({ business }: VintageTemplateProps) {
  const primaryColor = business.siteContent?.primaryColor ?? "#8b5a3c";

  return (
    <div className="flex min-h-screen flex-col bg-amber-50 font-serif">
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

      {/* Hero Section - Vintage Style */}
      <section className="relative bg-gradient-to-b from-amber-100 to-amber-50 px-4 py-32">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="mb-6 text-6xl font-bold tracking-tight text-gray-800 md:text-7xl">
            {business.siteContent?.heroTitle ?? business.name}
          </h1>
          {business.siteContent?.heroSubtitle && (
            <p className="mb-8 text-2xl text-gray-600 italic">
              {business.siteContent.heroSubtitle}
            </p>
          )}
          <Button
            asChild
            size="lg"
            className="border-2 text-white"
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            <Link href="/products">Explore Collection</Link>
          </Button>
        </div>
      </section>

      {/* Decorative Divider */}
      <div className="h-1 bg-gradient-to-r from-transparent via-gray-400 to-transparent" />

      {/* Featured Products */}
      {business.products.length > 0 && (
        <section className="px-4 py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-4xl font-bold text-gray-800">
                Curated Selection
              </h2>
              <p className="text-gray-600 italic">
                Handpicked for discerning customers
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {business.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      {business.siteContent?.aboutText && (
        <section className="bg-white px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-8 text-4xl font-bold text-gray-800">Our Story</h2>
            <p className="text-lg leading-relaxed whitespace-pre-line text-gray-600">
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
