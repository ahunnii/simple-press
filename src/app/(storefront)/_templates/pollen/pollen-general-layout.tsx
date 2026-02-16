import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Flower2,
  HandHelping,
  MapIcon,
  Users,
} from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { buttonVariants } from "~/components/ui/button";

import { PollenCallToAction } from "./pollen-cta";

type Props = {
  business: NonNullable<RouterOutputs["business"]["get"]>;
  children: React.ReactNode;
  title: string;
  subtitle: string;
  imageUrl?: string;
  showCTA?: boolean;
};
export function PollenGeneralLayout({
  business,
  children,
  title,
  subtitle,
  imageUrl,
  showCTA = true,
}: Props) {
  const themeSpecificFields = business?.siteContent?.customFields as Record<
    string,
    string
  >;

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <Image
          src={
            imageUrl ??
            "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1920&h=600&fit=crop"
          }
          alt=""
          fill
          className="object-cover object-right"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-[#2a351f]/90" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-sm font-medium tracking-wider text-[#A8D081] uppercase">
            {subtitle}
          </p>
          <h1 className="text-5xl font-bold text-white md:text-6xl lg:text-7xl">
            {title}
          </h1>
        </div>
      </section>

      {children}

      {showCTA && (
        <PollenCallToAction
          title={
            themeSpecificFields["pollen.global.cta-title"] ?? "Call to Action"
          }
          subtitle={
            themeSpecificFields["pollen.global.cta-subtitle"] ??
            "Call to Action"
          }
          description={
            themeSpecificFields["pollen.global.cta-text"] ?? "Call to Action"
          }
          buttonText={
            themeSpecificFields["pollen.global.cta-button-text"] ??
            "Call to Action"
          }
          buttonLink={
            themeSpecificFields["pollen.global.cta-button-link"] ?? "#!"
          }
          imageUrl={
            themeSpecificFields["pollen.global.cta-image"] ?? "/placeholder.svg"
          }
        />
      )}
    </div>
  );
}
