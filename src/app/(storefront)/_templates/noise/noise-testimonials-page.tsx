import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../types";
import { api } from "~/trpc/server";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "./index";

export async function NoiseTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, ["noise.homepage-testimonials-heading"]);
  const rawHeading = f["noise.homepage-testimonials-heading"] ?? "";
  const heading =
    rawHeading.trim() !== "" ? rawHeading : "Worn & Beloved";

  return (
    <PageTransition>
      <section className="border-b border-border bg-secondary py-20">
        <FadeIn className="mx-auto max-w-7xl px-4 lg:px-8">
          <p className="mb-4 font-sans text-[9px] tracking-[0.4em] uppercase text-muted-foreground">
            Testimonials
          </p>
          <h1 className="font-serif text-5xl font-light tracking-tight text-foreground md:text-6xl lg:text-7xl">
            {heading}
          </h1>
          <p className="mt-5 max-w-xl font-sans text-base text-muted-foreground">
            Voices from clients who wear the work.
          </p>
        </FadeIn>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        {testimonials.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-sans text-muted-foreground">
              No testimonials yet. Check back soon!
            </p>
            <Link
              href="/"
              className="mt-6 inline-block font-sans text-[10px] tracking-[0.25em] uppercase text-foreground/70 underline-offset-4 transition-colors hover:text-foreground"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <>
            <StaggerContainer
              className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3"
              staggerDelay={0.08}
            >
              {testimonials.map((t) => (
                <StaggerItem key={t.id}>
                  <article className="flex h-full flex-col border-t border-border pt-6">
                    <p className="font-serif text-xl font-light italic leading-relaxed text-foreground/80">
                      &ldquo;{t.text}&rdquo;
                    </p>
                    <div className="mt-8 flex items-center gap-3">
                      {t.photoUrls?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element -- remote customer photos
                        <img
                          src={t.photoUrls[0]}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="bg-foreground/8 flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif text-sm font-light text-foreground/70">
                          {t.customerName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <p className="font-sans text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                        — {t.customerName}
                      </p>
                    </div>
                    {t.photoUrls && t.photoUrls.length > 1 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {t.photoUrls.slice(1, 5).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="h-14 w-14 rounded-[0.15rem] object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                  </article>
                </StaggerItem>
              ))}
            </StaggerContainer>
            <div className="mt-16 text-center">
              <Link
                href="/about"
                className="font-sans text-[10px] tracking-[0.25em] uppercase text-muted-foreground underline-offset-4 transition-colors hover:text-foreground"
              >
                Our story
              </Link>
            </div>
          </>
        )}
      </section>
    </PageTransition>
  );
}
