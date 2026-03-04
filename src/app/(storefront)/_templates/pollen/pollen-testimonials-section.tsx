"use client";

import Image from "next/image";

import type { RouterOutputs } from "~/trpc/react";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

type Props = {
  testimonials: RouterOutputs["testimonial"]["listRandom"];
};
export function PollenTestimonialsSection({ testimonials }: Props) {
  if (testimonials.length === 0) return null;

  const gridCols =
    testimonials.length === 1
      ? "grid-cols-1 max-w-2xl mx-auto"
      : testimonials.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-3";

  return (
    <section className="relative overflow-hidden bg-[#2a351f] py-20 md:py-32">
      <div
        className="absolute inset-0 bg-[url('/flowers-pattern-1-white.svg')] bg-repeat opacity-[0.08]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn direction="up">
          <p className="mb-4 text-center text-sm font-medium tracking-wider text-[#A8D081] uppercase">
            Testimonials
          </p>
          <h2 className="mb-12 text-center text-3xl font-bold text-white md:text-4xl">
            Hear From Our Clients
          </h2>
        </FadeIn>

        <StaggerContainer className={`grid gap-8 ${gridCols}`}>
          {testimonials.map((testimonial) => (
            <StaggerItem key={testimonial.id}>
              <div className="rounded-2xl bg-[#3d4d2f]/80 p-8 backdrop-blur-sm">
                <p className="font-serif text-4xl text-white/30">&ldquo;</p>
                <p className="mt-2 mb-6 leading-relaxed text-white">
                  {testimonial.text}
                </p>
                <p className="font-semibold text-white">
                  {testimonial.customerName}
                </p>
                {testimonial.photoUrls && testimonial.photoUrls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {testimonial.photoUrls.slice(0, 3).map((url, i) => (
                      <div
                        key={i}
                        className="relative h-16 w-16 overflow-hidden rounded-lg"
                      >
                        <Image
                          src={url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
