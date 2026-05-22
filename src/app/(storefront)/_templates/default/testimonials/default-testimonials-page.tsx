import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { api } from "~/trpc/server";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { TestimonialsDisplay } from "~/components/testimonials-display";

export async function DefaultTestimonialsPage({}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  return (
    <>
      <PageTransition className="container mx-auto px-4 py-8 md:px-6 md:py-12">
        <section className="pt-20 text-center">
          <FadeIn className="mx-auto w-full max-w-4xl space-y-4">
            <h1
              className="text-left text-xl leading-none tracking-tight"
              style={{
                fontSize: "clamp(2.1rem, 5.25vw, 3.75rem)",
                letterSpacing: "-0.025em",
              }}
            >
              Testimonials
            </h1>

            <p className="mb-8 text-left text-gray-600">
              What our customers have to say about us
            </p>
          </FadeIn>
        </section>

        <section className="pt-8 pb-10">
          <FadeIn className="mx-auto w-full max-w-4xl">
            {testimonials.length === 0 ? (
              <div className="rounded-2xl bg-gray-50 py-16 text-center">
                <p className="text-gray-600">
                  No testimonials yet. Check back soon!
                </p>
                <Link
                  href="/"
                  className="mt-4 inline-block font-semibold text-[#5e8b4a] hover:underline"
                >
                  Back to home
                </Link>
              </div>
            ) : (
              <>
                <div className="py-12">
                  <TestimonialsDisplay
                    testimonials={testimonials}
                    layout="grid"
                  />
                </div>
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
              </>
            )}
          </FadeIn>
        </section>
      </PageTransition>
    </>
  );
}
