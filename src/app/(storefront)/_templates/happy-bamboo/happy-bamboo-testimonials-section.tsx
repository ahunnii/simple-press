"use client";

import { Quote } from "lucide-react";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Card, CardContent } from "~/components/ui/card";

import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "./happy-bamboo-animations";

const testimonials = [
  {
    quote:
      "I absolutely love Happy Bamboo! It's super soft, and I feel good knowing it's eco-friendly. Definitely my new go-to.",
    author: "Sarah",
    initials: "SA",
  },
  {
    quote:
      "Finally found a toilet tissue that's both comfortable and sustainable. The quality is top-notch, and it lasts longer than I expected!",
    author: "James",
    initials: "JA",
  },
  {
    quote:
      "This bamboo tissue is amazing. It feels great and knowing it's helping the planet makes me feel even better about using it.",
    author: "Monica",
    initials: "MO",
  },
];

export function HappyBambooTestimonialsSection() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <FadeIn className="mb-16 text-center">
          <span className="text-primary text-sm font-semibold tracking-wider uppercase">
            Testimonial
          </span>
          <h2 className="mt-2 text-4xl font-bold md:text-5xl">
            What Consumers Say
          </h2>
        </FadeIn>

        <StaggerContainer
          staggerDelay={0.15}
          className="grid gap-8 md:grid-cols-3"
        >
          {testimonials.map((testimonial) => (
            <StaggerItem key={testimonial.author}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col p-8">
                  <Quote className="text-primary/30 mb-4 h-8 w-8" />
                  <p className="text-foreground flex-1 text-lg leading-relaxed">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {testimonial.initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold">{testimonial.author}</span>
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
