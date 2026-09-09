import Link from "next/link";
import { ArrowRight, Quote, Star } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "..";
import { BambooSectionHeading } from "./bamboo-section-heading";

type Props = {
  customFields: unknown;
  testimonials: RouterOutputs["testimonial"]["listRandom"];
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export function BambooTestimonialsSection({
  customFields,
  testimonials,
}: Props) {
  const f = resolveFields(customFields, [
    "bamboo.homepage.testimonials-eyebrow",
    "bamboo.homepage.testimonials-heading",
    "bamboo.homepage.testimonials-button-text",
  ]);

  const buttonText = f["bamboo.homepage.testimonials-button-text"] ?? "";

  return (
    <section
      {...sectionGroupAttr("homepage", "testimonials")}
      aria-label="Customer testimonials"
      className="bg-[var(--bam-cream)]"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 md:py-32 lg:px-8">
        <FadeIn direction="up">
          <BambooSectionHeading
            eyebrow={f["bamboo.homepage.testimonials-eyebrow"] ?? ""}
            eyebrowFieldKey="bamboo.homepage.testimonials-eyebrow"
            heading={f["bamboo.homepage.testimonials-heading"] ?? ""}
            headingFieldKey="bamboo.homepage.testimonials-heading"
            className="mb-16"
          />
        </FadeIn>

        <StaggerContainer
          staggerDelay={0.15}
          className="grid gap-8 md:grid-cols-3"
        >
          {testimonials.map((t) => (
            <StaggerItem key={t.id} className="h-full">
              <figure className="bg-card flex h-full flex-col rounded-2xl border border-[var(--bam-hairline)] p-8 transition-shadow hover:shadow-md">
                <div
                  className="flex gap-0.5"
                  role="img"
                  aria-label="5 out of 5 stars"
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="size-4 fill-[var(--bam-gold)] text-[var(--bam-gold)]"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <Quote
                  className="mt-5 mb-3 size-7 text-[var(--bam-gold)]/40"
                  aria-hidden="true"
                />
                <blockquote className="text-foreground/80 flex-1 text-base leading-relaxed text-pretty">
                  &ldquo;{t.text}&rdquo;
                </blockquote>
                <figcaption className="mt-7 flex items-center gap-3 border-t border-[var(--bam-hairline)] pt-6">
                  <Avatar className="size-11 shrink-0">
                    <AvatarFallback className="bg-[var(--bam-forest)] text-sm font-medium text-[var(--bam-cream)]">
                      {getInitials(t.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-heading text-foreground text-base">
                      {t.customerName}
                    </p>
                    {[t.customerTitle, t.customerCompany].filter(Boolean)
                      .length > 0 ? (
                      <p className="text-muted-foreground text-xs tracking-wide uppercase">
                        {[t.customerTitle, t.customerCompany]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {buttonText ? (
          <FadeIn direction="up" delay={0.3}>
            <div className="mt-12 text-center">
              <Link
                href="/testimonials"
                className="group text-foreground inline-flex items-center gap-2.5 border-b border-[var(--bam-gold)]/50 pb-1 text-sm font-semibold tracking-widest uppercase transition-colors hover:border-[var(--bam-gold)] hover:text-[var(--bam-forest)]"
              >
                <span
                  {...fieldAttr("bamboo.homepage.testimonials-button-text")}
                >
                  {buttonText}
                </span>
                <ArrowRight
                  className="size-4 shrink-0 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </FadeIn>
        ) : null}
      </div>
    </section>
  );
}
