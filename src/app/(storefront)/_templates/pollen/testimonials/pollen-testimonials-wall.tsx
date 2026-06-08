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
      <section className="relative overflow-hidden py-20 md:py-32">
        <div
          className="pointer-events-none absolute inset-0 bg-[url('/flowers-pattern-1-white.svg')] bg-repeat opacity-10 select-none"
          aria-hidden
        />
        <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center justify-center px-4 sm:px-8">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-yellow-200 bg-yellow-100">
            <svg
              className="h-8 w-8 text-yellow-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 18.25c-1.38 0-2.5-1.12-2.5-2.5h5c0 1.38-1.12 2.5-2.5 2.5z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.22 8.22a4 4 0 1 1 7.56 0M2 12c0-5.52 4.48-10 10-10s10 4.48 10 10c0 4.42-3.18 8.12-7.5 9.58"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-center text-lg font-medium text-gray-600">
            No testimonials yet.
          </h2>
          <p className="max-w-md text-center text-sm text-gray-600">
            When reviews are posted, you’ll see them here!
          </p>
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
