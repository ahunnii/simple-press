import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DarkTrendProductPage } from "../../_templates/dark-trend/dark-trend-product-page";
import { DefaultProductPage } from "../../_templates/default/default-product-page";
import { ElegantProductPage } from "../../_templates/elegant/elegant-product-page";
import { ModernProductPage } from "../../_templates/modern/modern-product-page";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;

  // Find business
  const business = await api.business.simplifiedGet();

  // Find product
  const product = await api.product.get(slug);

  if (!product) {
    notFound();
  }

  // if (business.templateId === "modern") {
  //   return (
  //     <HydrateClient>
  //       <ModernProductPage business={business} product={product} />
  //     </HydrateClient>
  //   );
  // }

  const TemplateComponent =
    {
      modern: ModernProductPage,
      elegant: ElegantProductPage,
      "dark-trend": DarkTrendProductPage,
    }[business.templateId] ?? DefaultProductPage;

  return <TemplateComponent business={business} product={product} />;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await api.product.get(slug);

  if (!product) return { title: "Product Not Found" };

  return {
    title: `${product.name} `,
    description: product.description,
  };
}
