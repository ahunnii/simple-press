"use client";

import Link from "next/link";
import { ArrowRight, Leaf } from "lucide-react";

import { Button } from "~/components/ui/button";
import { FadeIn, ScaleIn } from "~/components/page-animations";

type Props = {
  heading?: string;
  body?: string;
  primaryButtonText?: string;
  primaryButtonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
};

export function HappyBambooCtaSection({
  heading = "Ready to Make the Switch?",
  body = "Join thousands of eco-conscious households who have already made the switch to Happy Bamboo. Experience premium quality while making a positive impact on our planet.",
  primaryButtonText = "Shop Now",
  primaryButtonLink = "/shop",
  secondaryButtonText = "Learn More",
  secondaryButtonLink = "/about",
}: Props) {
  return (
    <section className="bg-primary relative overflow-hidden py-20 md:py-32">
      {/* Decorative Elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-20 -left-20 h-64 w-64 rounded-full bg-white blur-3xl" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <FadeIn className="mx-auto max-w-3xl text-center">
          <ScaleIn className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <Leaf className="text-primary-foreground h-8 w-8" />
          </ScaleIn>

          <h2 className="text-primary-foreground mb-6 font-serif text-4xl font-bold md:text-5xl">
            {heading}
          </h2>
          {body && (
            <p className="text-primary-foreground/80 mb-8 text-lg">{body}</p>
          )}

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              variant="secondary"
              className="group text-lg"
              asChild
            >
              <Link href={primaryButtonLink}>
                {primaryButtonText}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            {secondaryButtonText && (
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent text-lg"
                asChild
              >
                <Link href={secondaryButtonLink}>{secondaryButtonText}</Link>
              </Button>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
