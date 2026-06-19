"use client";

import { useCallback, useState } from "react";
import Link from "next/link";

import type { RouterOutputs } from "~/trpc/react";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import {
  PollenTestimonialCard,
  PollenTestimonialLightbox,
} from "./pollen-testimonial-card";

type Props = {
  testimonials: RouterOutputs["testimonial"]["list"];
  sectionLabel?: string;
  sectionHeading?: string;
  viewAllText?: string;
};

export function PollenTestimonialsSection({
  testimonials,
  sectionLabel = "Testimonials",
  sectionHeading = "Hear From Our Clients",
  viewAllText = "View all testimonials",
}: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);

  const openLightbox = useCallback((urls: string[], startIndex: number) => {
    setLightboxUrls(urls);
    setLightboxStartIndex(startIndex);
    setLightboxOpen(true);
  }, []);

  if (testimonials.length === 0) return null;

  const gridCols =
    testimonials.length === 1
      ? "grid-cols-1 max-w-2xl mx-auto"
      : testimonials.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-3";

  return (
    <>
      <section className="relative overflow-hidden bg-[#2a351f] py-15 md:py-24">
        <div
          className="absolute inset-0 bg-[url('/flowers-pattern-1-white.svg')] bg-repeat opacity-[0.08]"
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn direction="up">
            <p className="mb-4 text-center text-sm font-medium tracking-wider text-[#A8D081] uppercase">
              {sectionLabel}
            </p>
            <h2 className="mb-12 text-center text-3xl font-bold text-white md:text-4xl">
              {sectionHeading}
            </h2>
          </FadeIn>

          <StaggerContainer className={`grid gap-8 ${gridCols}`}>
            {testimonials.map((testimonial) => (
              <StaggerItem key={testimonial.id}>
                <PollenTestimonialCard
                  testimonial={testimonial}
                  onOpenLightbox={openLightbox}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>

          <div className="mt-12 text-center">
            <Link
              href="/testimonials"
              className="inline-flex items-center font-semibold text-[#A8D081] transition-colors hover:text-[#c5e8a8] hover:underline focus:ring-2 focus:ring-[#A8D081] focus:ring-offset-2 focus:ring-offset-[#2a351f] focus:outline-none"
            >
              {viewAllText}
            </Link>
          </div>
        </div>
      </section>

      <PollenTestimonialLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        urls={lightboxUrls}
        startIndex={lightboxStartIndex}
      />
    </>
  );
}
