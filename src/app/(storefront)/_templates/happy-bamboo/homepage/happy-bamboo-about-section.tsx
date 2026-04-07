"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { TiptapJSON } from "~/components/tiptap-renderer";
import { Button } from "~/components/ui/button";
import { FadeIn } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

type Props = {
  aboutVideoUrl?: string | null;
  aboutVideoPosterUrl?: string | null;
  aboutImageUrl?: string | null;
  aboutHeading?: string | null;
  aboutDescription?: TiptapJSON | null;
  aboutButtonText?: string | null;
  aboutButtonLink?: string | null;
};

const DEFAULT_ABOUT_VIDEO_URL = "https://www.w3schools.com/html/mov_bbb.mp4";

export function HappyBambooAboutSection({
  aboutDescription,
  aboutVideoUrl,
  aboutVideoPosterUrl,
  aboutImageUrl,
  aboutHeading = "Our Vision for a Sustainable Future",
  aboutButtonText = "Read More About Us",
  aboutButtonLink = "/about",
}: Props) {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <FadeIn
            direction="left"
            className="relative flex flex-col gap-4 md:gap-5"
          >
            <div className="relative aspect-video overflow-hidden rounded-2xl">
              {!!aboutVideoUrl ? (
                <video
                  className="absolute inset-0 h-full w-full object-fill"
                  src={aboutVideoUrl ?? DEFAULT_ABOUT_VIDEO_URL}
                  muted
                  playsInline
                  controls
                  poster={aboutVideoPosterUrl ?? "/placeholder.svg"}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <Image
                  src={aboutVideoPosterUrl!}
                  alt="About video poster"
                  fill
                  className="object-cover"
                />
              )}
            </div>

            <div className="border-border bg-muted/30 relative aspect-4/3 w-full overflow-hidden rounded-2xl border shadow-sm ring-1 ring-black/5">
              <Image
                src={aboutImageUrl!}
                alt={
                  aboutHeading
                    ? `${aboutHeading} — additional image`
                    : "About section image"
                }
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            {/* <ScaleIn
              delay={0.3}
              className="bg-primary text-primary-foreground absolute -right-6 -bottom-6 rounded-xl p-6 shadow-lg md:-right-8 md:-bottom-8"
            >
              <p className="text-3xl font-bold md:text-4xl">100%</p>
              <p className="text-sm font-medium">Sustainable</p>
            </ScaleIn> */}
          </FadeIn>

          <FadeIn direction="right" className="space-y-6">
            <span className="text-primary text-sm font-semibold tracking-wider uppercase">
              Zaires Visions
            </span>
            <h2 className="font-serif text-4xl leading-tight font-bold md:text-5xl">
              {aboutHeading}
            </h2>
            {aboutDescription ? (
              <TiptapRenderer
                content={aboutDescription}
                className="text-muted-foreground prose prose-sm md:prose-base prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-strong:text-foreground max-w-none leading-relaxed"
              />
            ) : (
              <div className="text-muted-foreground space-y-4 leading-relaxed">
                <p>
                  Zaires Visions is a purpose-driven company dedicated to
                  creating healthier, more sustainable household products. Our
                  company was built on a simple belief: everyday products should
                  support both personal well-being and environmental
                  responsibility. Through our brand Happy Bamboo, we provide
                  eco-friendly alternatives to traditional paper products by
                  using 100% bamboo pulp, a rapidly renewable resource that
                  regenerates in just a few years without contributing to
                  deforestation. Our products are designed to be chemical-free,
                  biodegradable, and septic-safe, delivering a cleaner, more
                  sustainable option for families, businesses, and institutions.
                </p>
              </div>
            )}
            <Button variant="outline" className="group" asChild>
              <Link href={aboutButtonLink ?? "/about"}>
                {aboutButtonText}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
