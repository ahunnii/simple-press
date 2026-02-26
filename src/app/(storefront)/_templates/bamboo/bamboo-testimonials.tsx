import { Star } from "lucide-react";

import { Card, CardContent } from "~/components/ui/card";

import { StaggerContainer, StaggerItem } from "./bamboo-animations";

const testimonials = [
  {
    name: "Sarah M.",
    location: "Ann Arbor, MI",
    quote:
      "I never thought I would care this much about toilet paper, but the softness and quality are genuinely impressive. Knowing it is eco-friendly makes it even better.",
    stars: 5,
  },
  {
    name: "James T.",
    location: "Chicago, IL",
    quote:
      "We switched our entire household to Finally Results and have not looked back. The starter kit is the perfect way to try everything. Our septic system thanks us too.",
    stars: 5,
  },
  {
    name: "Angela R.",
    location: "Detroit, MI",
    quote:
      "Supporting a local Detroit business that actually cares about sustainability? That is a win-win. The product quality is on par with luxury brands at a fraction of the environmental cost.",
    stars: 5,
  },
];

export function BambooTestimonials() {
  return (
    <StaggerContainer
      className="grid grid-cols-1 gap-6 md:grid-cols-3"
      staggerDelay={0.12}
    >
      {testimonials.map((testimonial) => (
        <StaggerItem key={testimonial.name}>
          <Card className="border-border/60 bg-card h-full">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="flex gap-0.5">
                {Array.from({ length: testimonial.stars }).map((_, i) => (
                  <Star key={i} className="fill-accent text-accent size-4" />
                ))}
              </div>
              <blockquote className="text-muted-foreground flex-1 text-sm leading-relaxed">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <div>
                <p className="text-foreground text-sm font-semibold">
                  {testimonial.name}
                </p>
                <p className="text-muted-foreground text-xs">
                  {testimonial.location}
                </p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
