import type { DefaultTestimonialsPageTemplateProps } from "../types";
import { api } from "~/trpc/server";

import { PollenGeneralLayout } from "./pollen-general-layout";
import { PollenTestimonialsWall } from "./pollen-testimonials-wall";

export async function PollenTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  return (
    <PollenGeneralLayout
      business={business}
      title="Testimonials"
      subtitle="Kind Words"
    >
      <PollenTestimonialsWall testimonials={testimonials} />
    </PollenGeneralLayout>
  );
}
