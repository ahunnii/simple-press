import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { api } from "~/trpc/server";

import { ElegantTestimonialsClient } from "./elegant-testimonials-client";

export async function ElegantTestimonialsPage({
  business: _business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });
  return <ElegantTestimonialsClient testimonials={testimonials} />;
}
