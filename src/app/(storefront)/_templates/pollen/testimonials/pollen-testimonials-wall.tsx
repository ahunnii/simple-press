"use client";

import { useCallback, useState } from "react";

import type { RouterOutputs } from "~/trpc/react";

import {
  PollenTestimonialCard,
  PollenTestimonialLightbox,
} from "./pollen-testimonial-card";

type Props = {
  testimonials: RouterOutputs["testimonial"]["list"];
};

export function PollenTestimonialsWall({ testimonials }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxUrls, setLightboxUrls] = useState<string[]>([]);
  const [lightboxStartIndex, setLightboxStartIndex] = useState(0);

  const openLightbox = useCallback((urls: string[], startIndex: number) => {
    setLightboxUrls(urls);
    setLightboxStartIndex(startIndex);
    setLightboxOpen(true);
  }, []);

  if (testimonials.length === 0) {
    return (
      <section className="relative overflow-hidden py-15 md:py-24">
        <div
          className="absolute inset-0 bg-[url('/flowers-pattern-1-white.svg')] bg-repeat opacity-[0.08]"
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-white/80">No testimonials yet.</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden py-15 md:py-24">
        <div
          className="absolute inset-0 bg-[url('/flowers-pattern-1-white.svg')] bg-repeat opacity-[0.08]"
          aria-hidden
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="columns-2 gap-x-6 md:columns-3 lg:columns-4">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="mb-6 break-inside-avoid">
                <PollenTestimonialCard
                  testimonial={testimonial}
                  onOpenLightbox={openLightbox}
                />
              </div>
            ))}
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
