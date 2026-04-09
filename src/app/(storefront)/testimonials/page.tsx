import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { BambooTestimonialsPage } from "../_templates/bamboo/testimonials/bamboo-testimonials-page";
import { DarkTrendTestimonialsPage } from "../_templates/dark-trend/testimonials/dark-trend-testimonials-page";
import { DefaultTestimonialsPage } from "../_templates/default/default-testimonials-page";
import { ElegantTestimonialsPage } from "../_templates/elegant/elegant-testimonials-page";
import { HappyBambooTestimonialsPage } from "../_templates/happy-bamboo/happy-bamboo-testimonials-page";
import { ModernTestimonialsPage } from "../_templates/modern/modern-testimonials-page";
import { NoiseTestimonialsPage } from "../_templates/noise/noise-testimonials-page";
import { PollenTestimonialsPage } from "../_templates/pollen/pollen-testimonials-page";

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
    }[business.templateId] ?? DefaultTestimonialsPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Testimonials",
  description: "Customer testimonials",
};
