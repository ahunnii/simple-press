import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../types";
import { api } from "~/trpc/server";
import { TestimonialsDisplay } from "~/components/testimonials-display";

export async function DefaultTestimonialsPage({}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-[#374151] md:text-4xl">
          Testimonials
        </h1>
        <p className="mt-2 text-gray-600">
          What our customers have to say about us
        </p>
      </div>

      {testimonials.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 py-16 text-center">
          <p className="text-gray-600">No testimonials yet. Check back soon!</p>
          <Link
            href="/"
            className="mt-4 inline-block font-semibold text-[#5e8b4a] hover:underline"
          >
            Back to home
          </Link>
        </div>
      ) : (
        <>
          <TestimonialsDisplay testimonials={testimonials} layout="grid" />
          <div className="mt-8 text-center">
            <Link
              href="/about"
              className="font-semibold text-[#5e8b4a] hover:underline"
            >
              About us
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
