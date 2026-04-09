import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { api } from "~/trpc/server";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { resolveFields } from "../index";

export async function NoiseTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, [
    "noise.homepage-testimonials-heading",
  ]);
  const rawHeading = f["noise.homepage-testimonials-heading"] ?? "";
  const heading = rawHeading.trim() !== "" ? rawHeading : "Worn & Beloved";

  return (
    <PageTransition>
      <section className="border-border bg-secondary border-b py-20">
        <FadeIn className="mx-auto max-w-7xl px-4 lg:px-8">
          <p className="text-muted-foreground mb-4 font-sans text-[9px] tracking-[0.4em] uppercase">
            Testimonials
          </p>
          <h1 className="text-foreground font-serif text-5xl font-light tracking-tight md:text-6xl lg:text-7xl">
            {heading}
          </h1>
          <p className="text-muted-foreground mt-5 max-w-xl font-sans text-base">
            Voices from clients who wear the work.
          </p>
        </FadeIn>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        {testimonials.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground font-sans">
              No testimonials yet. Check back soon!
            </p>
            <Link
              href="/"
              className="text-foreground/70 hover:text-foreground mt-6 inline-block font-sans text-[10px] tracking-[0.25em] uppercase underline-offset-4 transition-colors"
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
                  <article className="border-border flex h-full flex-col border-t pt-6">
                    <p className="text-foreground/80 font-serif text-xl leading-relaxed font-light italic">
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
                        <div className="bg-foreground/8 text-foreground/70 flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-serif text-sm font-light">
                          {t.customerName.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <p className="text-muted-foreground font-sans text-[10px] tracking-[0.25em] uppercase">
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
            <div className="border-border mt-16 border-t pt-16 text-center">
              <p className="text-muted-foreground font-sans text-[9px] tracking-[0.4em] uppercase">
                Your Voice
              </p>
              <h2 className="text-foreground mt-3 font-serif text-3xl font-light tracking-tight">
                Share Your Experience
              </h2>
              <p className="text-muted-foreground mt-3 font-sans text-base">
                We&apos;d love to hear from you.
              </p>
              <Link
                href="/testimonials/submit"
                className="border-foreground text-foreground hover:bg-foreground hover:text-background mt-6 inline-block border px-8 py-3 font-sans text-[10px] tracking-[0.3em] uppercase transition-colors"
              >
                Write a Testimonial
              </Link>
            </div>
            <div className="mt-12 text-center">
              <Link
                href="/about"
                className="text-muted-foreground hover:text-foreground font-sans text-[10px] tracking-[0.25em] uppercase underline-offset-4 transition-colors"
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
