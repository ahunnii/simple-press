"use client";

import { Quote } from "lucide-react";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Card, CardContent } from "~/components/ui/card";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

type Testimonial = {
  id: string;
  customerName: string;
  text: string;
};

type Props = {
  heading?: string;
  testimonials: Testimonial[];
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function HappyBambooTestimonialsSection({
  heading = "What Consumers Say",
  testimonials,
  sectionAttrs,
}: Props) {
  if (testimonials.length === 0) return null;

  return (
    <section className="py-20 md:py-32" {...sectionAttrs}>
      <div className="container mx-auto px-4">
        <FadeIn className="mb-16 text-center">
          <span className="text-primary text-sm font-semibold tracking-wider uppercase">
            Testimonial
          </span>
          <h2 className="mt-2 font-serif text-4xl font-bold md:text-5xl">
            {heading}
          </h2>
        </FadeIn>

        <StaggerContainer
          staggerDelay={0.15}
          className="grid gap-8 md:grid-cols-3"
        >
          {testimonials.map((testimonial) => (
            <StaggerItem key={testimonial.id}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col p-8">
                  <Quote className="text-primary/30 mb-4 h-8 w-8" aria-hidden="true" />
                  <p className="text-foreground flex-1 text-lg leading-relaxed">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(testimonial.customerName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">
                      {testimonial.customerName}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
