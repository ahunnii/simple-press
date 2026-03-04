import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { DefaultTestimonialsPage } from "../_templates/default/default-testimonials-page";
import { PollenTestimonialsPage } from "../_templates/pollen/pollen-testimonials-page";

export default async function TestimonialsPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const TemplateComponent =
    {
      pollen: PollenTestimonialsPage,
    }[business.templateId] ?? DefaultTestimonialsPage;

  return <TemplateComponent business={business} />;
}

export const metadata = {
  title: "Testimonials",
  description: "Customer testimonials",
};
