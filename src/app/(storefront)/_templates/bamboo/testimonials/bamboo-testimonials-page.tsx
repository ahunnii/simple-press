/* eslint-disable @next/next/no-img-element -- remote customer-uploaded photos */
import Link from "next/link";
import { Quote, Star } from "lucide-react";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
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
        className="bg-secondary py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
          <FadeIn>
            <span className="text-primary text-sm font-semibold tracking-wider uppercase">
              Testimonials
            </span>
            <h1 className="text-foreground font-heading mt-2 text-4xl font-bold tracking-tight md:text-5xl">
              {heading}
            </h1>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg leading-relaxed">
              {subheading}
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="py-12 md:py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          {testimonials.length === 0 ? (
            <FadeIn>
              <div className="bg-muted/40 mx-auto max-w-xl rounded-2xl py-16 text-center">
                <p className="text-muted-foreground">
                  No testimonials yet. Check back soon!
                </p>
                <Link
                  href="/"
                  className="text-primary mt-6 inline-block font-semibold hover:underline"
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
                  <Card className="border-border/60 bg-card h-full">
                    <CardContent className="flex h-full flex-col p-8">
                      <div className="flex gap-0.5" role="img" aria-label="5 out of 5 stars">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="fill-accent text-accent size-4"
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                      <Quote className="text-primary/30 mt-4 mb-3 h-8 w-8" aria-hidden="true" />
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
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
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
            <div className="bg-secondary/50 mx-auto max-w-2xl rounded-2xl px-8 py-12">
              <h2 className="font-heading text-2xl font-bold">
                Share Your Experience
              </h2>
              <p className="text-muted-foreground mt-2">
                Loved shopping with us? We&apos;d love to hear from you.
              </p>
              <Link
                href="/testimonials/submit"
                className="bg-primary text-primary-foreground mt-6 inline-block rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
              >
                Write a Testimonial
              </Link>
            </div>
          </FadeIn>

          {testimonials.length > 0 ? (
            <FadeIn className="mt-10 text-center">
              <Link
                href="/shop"
                className="text-primary font-semibold hover:underline"
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
