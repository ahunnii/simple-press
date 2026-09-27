import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { api } from "~/trpc/server";

import { ElegantTestimonialsClient } from "./elegant-testimonials-client";

export async function ElegantTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });
  return (
    <ElegantTestimonialsClient
      testimonials={testimonials}
      customFields={business?.siteContent?.customFields}
    />
  );
}
