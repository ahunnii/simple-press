import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import { api } from "~/trpc/server";

import { BambooTestimonialsPage } from "../_templates/bamboo/testimonials/bamboo-testimonials-page";
import { DarkTrendTestimonialsPage } from "../_templates/dark-trend/testimonials/dark-trend-testimonials-page";
import { DefaultTestimonialsPage } from "../_templates/default/testimonials/default-testimonials-page";
import { ElegantTestimonialsPage } from "../_templates/elegant/testimonials/elegant-testimonials-page";
import { HappyBambooTestimonialsPage } from "../_templates/happy-bamboo/testimonials/happy-bamboo-testimonials-page";
import { ModernTestimonialsPage } from "../_templates/modern/testimonials/modern-testimonials-page";
import { NoiseTestimonialsPage } from "../_templates/noise/testimonials/noise-testimonials-page";
import { PollenTestimonialsPage } from "../_templates/pollen/testimonials/pollen-testimonials-page";
import { SledgeTestimonialsPage } from "../_templates/sledge/testimonials/sledge-testimonials-page";

export default async function TestimonialsPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const TemplateComponent =
    {
      pollen: PollenTestimonialsPage,
      bamboo: BambooTestimonialsPage,
      "dark-trend": DarkTrendTestimonialsPage,
      elegant: ElegantTestimonialsPage,
      modern: ModernTestimonialsPage,
      "happy-bamboo": HappyBambooTestimonialsPage,
      noise: NoiseTestimonialsPage,
      sledge: SledgeTestimonialsPage,
    }[business.templateId] ?? DefaultTestimonialsPage;

  return <TemplateComponent business={business} />;
}

export async function generateMetadata() {
  const business = await api.business.simplifiedGet();
  return {
    title: "Testimonials",
    description: "Customer testimonials",
    ...(business && {
      alternates: {
        canonical: getCanonicalUrl(business, "/testimonials"),
      },
    }),
  };
}
