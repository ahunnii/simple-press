import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";

const galleryItems = [
  {
    label: "Eastern Market District",
    src: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=450&fit=crop",
  },
  {
    label: "Palmer Woods",
    src: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&h=450&fit=crop",
  },
  {
    label: "New Center Commons",
    src: "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=600&h=450&fit=crop",
  },
  {
    label: "Belle Isle Conservatory",
    src: "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=600&h=450&fit=crop",
  },
  {
    label: "Detroit Botanical Gardens",
    src: "https://images.unsplash.com/photo-1598902108854-10e335adac99?w=600&h=450&fit=crop",
  },
  {
    label: "Fitzgerald Neighborhood",
    src: "https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=600&h=450&fit=crop",
  },
];

export function PollenHomepageGallery() {
  return (
    <section id="gallery" className="bg-background py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="text-primary mb-4 text-sm font-medium tracking-wider uppercase">
            Checkout Our Portfolio
          </p>
          <h2 className="text-foreground text-3xl font-bold text-balance md:text-4xl">
            Transforming Detroit, One Garden at a Time
          </h2>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleryItems.map((item) => (
            <div
              key={item.label}
              className="group relative aspect-4/3 overflow-hidden rounded-xl"
            >
              <Image
                src={item.src}
                alt={item.label}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-black/40" />
              <p className="absolute bottom-4 left-4 text-lg font-medium text-white drop-shadow-sm">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <Link
            href="/gallery"
            className={buttonVariants({
              size: "lg",
              className: "gap-2 bg-[#5e8b4a]! hover:bg-[#5e8b4a]/90!",
            })}
          >
            View Portfolio
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
