import type { RouterOutputs } from "~/trpc/react";
import { FadeIn, StaggerContainer, StaggerItem } from "~/components/page-animations";

type Testimonial = RouterOutputs["testimonial"]["listRandom"][number];

type NoiseTestimonialsSectionProps = {
  heading?: string;
  testimonials: Testimonial[];
};

export function NoiseTestimonialsSection({
  heading,
  testimonials,
}: NoiseTestimonialsSectionProps) {
  if (!testimonials.length) return null;

  const displayHeading = heading ?? "Worn & Beloved";

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <FadeIn className="mb-16">
          <p className="mb-3 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
            Testimonials
          </p>
          <h2 className="font-serif text-4xl font-light tracking-tight text-foreground md:text-5xl">
            {displayHeading}
          </h2>
        </FadeIn>

        <StaggerContainer
          className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.1}
        >
          {testimonials.map((t) => (
            <StaggerItem key={t.id}>
              <div className="flex flex-col gap-4 border-t border-border pt-6">
                <p className="font-serif text-xl font-light italic leading-relaxed text-foreground/80">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-auto">
                  <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                    — {t.customerName}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
