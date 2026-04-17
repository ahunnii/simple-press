import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";
import { buttonVariants } from "~/components/ui/button";

type GalleryItem = { label: string; image: string };

const DEFAULT_GALLERY_ITEMS: GalleryItem[] = [
  {
    label: "Eastern Market District",
    image:
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&h=450&fit=crop",
  },
  {
    label: "Palmer Woods",
    image:
      "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&h=450&fit=crop",
  },
  {
    label: "New Center Commons",
    image:
      "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=600&h=450&fit=crop",
  },
  {
    label: "Belle Isle Conservatory",
    image:
      "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=600&h=450&fit=crop",
  },
  {
    label: "Detroit Botanical Gardens",
    image:
      "https://images.unsplash.com/photo-1598902108854-10e335adac99?w=600&h=450&fit=crop",
  },
  {
    label: "Fitzgerald Neighborhood",
    image:
      "https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=600&h=450&fit=crop",
  },
];

type Props = {
  sectionLabel: string;
  sectionHeading: string;
  buttonText: string;
  buttonLink: string;
  galleryItems: GalleryItem[];
};

export function PollenHomepageGallery({
  sectionLabel,
  sectionHeading,
  buttonText,
  buttonLink,
  galleryItems,
}: Props) {
  const items = galleryItems.length > 0 ? galleryItems : DEFAULT_GALLERY_ITEMS;

  return (
    <section id="gallery" className="bg-background py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn direction="up">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-primary mb-4 text-sm font-medium tracking-wider uppercase">
              {sectionLabel}
            </p>
            <h2 className="text-foreground text-3xl font-bold text-balance md:text-4xl">
              {sectionHeading}
            </h2>
          </div>
        </FadeIn>

        <StaggerContainer className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <StaggerItem key={item.label}>
              <div className="group relative aspect-4/3 overflow-hidden rounded-xl">
                <Image
                  src={item.image}
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
            </StaggerItem>
          ))}
        </StaggerContainer>

        <div className="flex justify-center">
          <Link
            href={buttonLink}
            className={buttonVariants({
              size: "lg",
              className: "gap-2 bg-[#5e8b4a]! hover:bg-[#5e8b4a]/90!",
            })}
          >
            {buttonText}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
