/* eslint-disable @next/next/no-img-element -- remote customer-uploaded photos */
import Link from "next/link";
import { Quote } from "lucide-react";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card, CardContent } from "~/components/ui/card";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "../";

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export async function BambooTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  const f = resolveFields(business?.siteContent?.customFields, [
    "bamboo.testimonials-page.heading",
    "bamboo.testimonials-page.subheading",
  ]);

  const heading = f["bamboo.testimonials-page.heading"] ?? "What Customers Say";
  const subheading =
    f["bamboo.testimonials-page.subheading"] ??
    "Real stories from households that made the switch.";

  return (
    <PageTransition>
      <section
        {...sectionGroupAttr("testimonials", "page")}
        className="bg-[var(--bam-cream-deep)] py-20 md:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
          <FadeIn>
            <span className="mb-3 block text-xs font-semibold tracking-widest text-[var(--bam-gold)] uppercase">
              Testimonials
            </span>
            <h1
              className="text-foreground font-serif text-4xl font-bold tracking-tight md:text-5xl"
              {...fieldAttr("bamboo.testimonials-page.heading")}
            >
              {heading}
            </h1>
            <p
              className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg leading-relaxed"
              {...fieldAttr("bamboo.testimonials-page.subheading")}
            >
              {subheading}
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          {testimonials.length === 0 ? (
            <FadeIn>
              <div className="mx-auto max-w-xl rounded-2xl border border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)] py-16 text-center">
                <p className="text-muted-foreground">
                  No testimonials yet. Check back soon!
                </p>
                <Link
                  href="/"
                  className="mt-6 inline-block font-semibold text-[var(--bam-forest)] hover:underline"
                >
                  Back to home
                </Link>
              </div>
            </FadeIn>
          ) : (
            <StaggerContainer
              staggerDelay={0.08}
              className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
            >
              {testimonials.map((t) => (
                <StaggerItem key={t.id}>
                  <Card className="h-full rounded-2xl border-[var(--bam-hairline)] bg-card transition-shadow hover:shadow-md">
                    <CardContent className="flex h-full flex-col p-8">
                      <Quote
                        className="mb-4 h-8 w-8 text-[var(--bam-forest)]/30"
                        aria-hidden="true"
                      />
                      {t.title ? (
                        <p className="text-foreground mb-2 text-sm font-semibold">
                          {t.title}
                        </p>
                      ) : null}
                      <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
                        &ldquo;{t.text}&rdquo;
                      </p>
                      <div className="mt-6 flex items-start gap-3">
                        <Avatar className="h-12 w-12 shrink-0">
                          {t.photoUrls?.[0] ? (
                            <AvatarImage
                              src={t.photoUrls[0]}
                              alt=""
                              className="object-cover"
                            />
                          ) : null}
                          <AvatarFallback className="border border-[var(--bam-gold)]/40 bg-transparent text-sm font-medium text-[var(--bam-forest)]">
                            {getInitials(t.customerName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-foreground text-sm font-semibold">
                            {t.customerName}
                          </p>
                          {[t.customerTitle, t.customerCompany].filter(Boolean)
                            .length > 0 ? (
                            <p className="text-muted-foreground text-xs">
                              {[t.customerTitle, t.customerCompany]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      {t.photoUrls && t.photoUrls.length > 1 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {t.photoUrls.slice(1, 6).map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt=""
                              className="h-14 w-14 rounded-md object-cover"
                            />
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}

          <FadeIn className="mt-14 text-center">
            <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--bam-hairline)] bg-[var(--bam-cream-deep)] px-8 py-12">
              <h2 className="font-serif text-2xl font-bold">
                Share Your Experience
              </h2>
              <p className="text-muted-foreground mt-2">
                Loved shopping with us? We&apos;d love to hear from you.
              </p>
              <Link
                href="/testimonials/submit"
                className="mt-6 inline-block rounded-full bg-[var(--bam-forest)] px-6 py-3 text-sm font-semibold text-[var(--bam-cream)] transition-colors hover:bg-[var(--bam-forest-deep)]"
              >
                Write a Testimonial
              </Link>
            </div>
          </FadeIn>

          {testimonials.length > 0 ? (
            <FadeIn className="mt-10 text-center">
              <Link
                href="/shop"
                className="font-semibold text-[var(--bam-forest)] hover:underline"
              >
                Shop the collection
              </Link>
            </FadeIn>
          ) : null}
        </div>
      </section>
    </PageTransition>
  );
}
