"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import type { CarouselApi } from "~/components/ui/carousel";
import type { RouterOutputs } from "~/trpc/react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";

// Typed on `listRandom` — the PII-stripped public projection (no
// customerEmail/customerId). `list` rows are a superset and remain
// assignable, so both feeds work; the narrower type keeps this card
// honest about never rendering the admin-only columns.
export type PollenTestimonial =
  RouterOutputs["testimonial"]["listRandom"][number];

type PollenTestimonialCardProps = {
  testimonial: PollenTestimonial;
  onOpenLightbox: (urls: string[], startIndex: number) => void;
};

export function PollenTestimonialCard({
  testimonial,
  onOpenLightbox,
}: PollenTestimonialCardProps) {
  return (
    <div className="rounded-2xl bg-[#3d4d2f]/80 p-8 backdrop-blur-sm">
      <p className="font-serif text-4xl text-white/30" aria-hidden="true">
        &ldquo;
      </p>
      <p className="mt-2 mb-6 leading-relaxed text-white">{testimonial.text}</p>
      <p className="font-semibold text-white">{testimonial.customerName}</p>
      {testimonial.photoUrls && testimonial.photoUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {testimonial.photoUrls.slice(0, 3).map((url, i) => (
            <button
              type="button"
              key={i}
              onClick={() => onOpenLightbox(testimonial.photoUrls ?? [], i)}
              className="relative h-16 w-16 overflow-hidden rounded-lg transition-opacity hover:opacity-90 focus:ring-2 focus:ring-[#A8D081] focus:ring-offset-2 focus:ring-offset-[#2a351f] focus:outline-none"
              aria-label={`View image ${i + 1} of ${testimonial.photoUrls?.length ?? 0}`}
            >
              <Image
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type PollenTestimonialLightboxProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urls: string[];
  startIndex: number;
};

export function PollenTestimonialLightbox({
  open,
  onOpenChange,
  urls,
  startIndex,
}: PollenTestimonialLightboxProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);

  useEffect(() => {
    if (!open || !carouselApi || urls.length === 0) return;
    carouselApi.scrollTo(startIndex, true);
  }, [open, carouselApi, urls.length, startIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] w-[95vw] border-0 bg-transparent p-0 shadow-2xl backdrop-blur-xl **:data-[slot=dialog-close]:rounded-full **:data-[slot=dialog-close]:bg-white/10 **:data-[slot=dialog-close]:text-white/90 **:data-[slot=dialog-close]:hover:bg-white/20 **:data-[slot=dialog-close]:hover:text-white sm:max-w-6xl sm:rounded-2xl"
        showCloseButton={true}
      >
        <DialogTitle className="sr-only">
          Images from current testimonial
        </DialogTitle>
        <div className="relative flex min-h-[50vh] items-center justify-center p-6 md:p-12">
          <Carousel
            setApi={setCarouselApi}
            opts={{ align: "center", loop: true }}
            className="w-full"
          >
            <CarouselContent className="ml-0">
              {urls.map((url, i) => (
                <CarouselItem key={i} className="pl-0">
                  <div className="relative flex min-h-[60vh] w-full items-center justify-center overflow-hidden rounded-xl md:min-h-[70vh]">
                    <Image
                      src={url}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="(max-width: 1280px) 95vw, 1152px"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {urls.length > 1 && (
              <>
                <CarouselPrevious className="-left-2 size-11 rounded-full border-0 bg-white/90 text-[#2a351f] shadow-lg hover:bg-white md:-left-6 md:size-12" />
                <CarouselNext className="-right-2 size-11 rounded-full border-0 bg-white/90 text-[#2a351f] shadow-lg hover:bg-white md:-right-6 md:size-12" />
              </>
            )}
          </Carousel>
        </div>
      </DialogContent>
    </Dialog>
  );
}
