import { notFound } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";

import { DefaultProductPage } from "../../_templates/default/default-product-page";
import { ModernProductPage } from "../../_templates/modern/modern-product-page";

type PageProps = {
  params: Promise<{ slug: string }>;
};

// export async function generateStaticParams() {
//   const business = await api.business.get();
//   if (!business) {
//     return [];
//   }
//   const products = business.products;
//   return products.map((product) => ({ id: product.slug }));
// }

// export async function generateMetadata({
//   params,
// }: {
//   params: Promise<{ id: string }>;
// }) {
//   const { id } = await params;
//   const product = await api.product.get(id);
//   if (!product) return { title: "Product Not Found" };
//   return {
//     title: `${product.name} `,
//     description: product.description,
//   };
// }

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  // Find business
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  // Find product
  const product = await api.product.get(slug);

  if (!product) {
    notFound();
  }

  if (business.templateId === "modern") {
    return (
      <HydrateClient>
        <ModernProductPage business={business} product={product} />
      </HydrateClient>
    );
  }
  return (
    <HydrateClient>
      <DefaultProductPage business={business} product={product} />
    </HydrateClient>
  );
}
