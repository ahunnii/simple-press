import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { api } from "~/trpc/server";

import { PollenGeneralLayout } from "../layout/pollen-general-layout";
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
      <section className="bg-[#f5f2ee] py-16">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-2xl font-bold text-[#2a351f]">
            Share Your Experience
          </h2>
          <p className="mt-2 text-[#4c566a]">
            Loved shopping with us? We&apos;d love to hear from you.
          </p>
          <Link
            href="/testimonials/submit"
            className="mt-6 inline-block rounded-full bg-[#215935] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Write a Testimonial
          </Link>
        </div>
      </section>
    </PollenGeneralLayout>
  );
}
