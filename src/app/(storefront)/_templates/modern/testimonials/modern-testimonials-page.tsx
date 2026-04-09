import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { api } from "~/trpc/server";

import { ModernGeneralLayout } from "../layout/modern-general-layout";

export async function ModernTestimonialsPage({
  business: _business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  return (
    <ModernGeneralLayout
      title="Testimonials"
      subtitle="Kind words"
      excerpt="What our customers have to say"
    >
      <section className="bg-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {testimonials.length === 0 ? (
            <div className="bg-muted/40 rounded-2xl py-16 text-center">
              <p className="text-muted-foreground">
                No testimonials yet. Check back soon!
              </p>
              <Link
                href="/"
                className="text-primary mt-4 inline-block font-medium hover:underline"
              >
                Back to home
              </Link>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {testimonials.map((t) => (
                  <article
                    key={t.id}
                    className="bg-card text-card-foreground border-border/80 flex flex-col rounded-3xl border p-6 shadow-sm ring-1 ring-black/4 dark:ring-white/10"
                  >
                    <p className="text-foreground/80 mb-4 flex-1 font-serif text-xl leading-relaxed font-medium tracking-wide text-pretty">
                      &ldquo;{t.text}&rdquo;
                    </p>
                    <div className="border-border mt-auto flex items-start justify-between gap-3 border-t pt-6">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {t.photoUrls?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element -- remote customer photos
                          <img
                            src={t.photoUrls[0]}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                            {t.customerName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-foreground text-sm font-semibold">
                            {t.customerName}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Customer
                          </p>
                        </div>
                      </div>
                    </div>
                    {t.photoUrls && t.photoUrls.length > 1 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {t.photoUrls.slice(1, 5).map((url, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="h-14 w-14 rounded-md object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
              <div className="bg-muted/40 mt-12 rounded-2xl px-8 py-12 text-center">
                <h2 className="text-2xl font-bold">Share Your Experience</h2>
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
              <div className="mt-8 text-center">
                <Link
                  href="/about"
                  className="text-primary font-medium hover:underline"
                >
                  About us
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </ModernGeneralLayout>
  );
}
