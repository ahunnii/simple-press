import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
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
          <div className="mt-12 rounded-2xl bg-gray-50 px-8 py-12 text-center">
            <h2 className="text-2xl font-bold text-[#374151]">
              Share Your Experience
            </h2>
            <p className="mt-2 text-gray-600">
              Loved shopping with us? We&apos;d love to hear from you.
            </p>
            <Link
              href="/testimonials/submit"
              className="mt-6 inline-block rounded-full bg-[#5e8b4a] px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Write a Testimonial
            </Link>
          </div>
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
