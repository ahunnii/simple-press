import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { api } from "~/trpc/server";

import { DarkTrendGeneralLayout } from "../layout/dark-trend-general-layout";

export async function DarkTrendTestimonialsPage({
  business: _business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  return (
    <DarkTrendGeneralLayout
      title="Testimonials"
      excerpt="What our customers say"
    >
      {testimonials.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg text-white/60">
            No testimonials yet. Check back soon!
          </p>
          <Link
            href="/"
            className="mt-6 inline-block font-semibold text-purple-400 hover:text-purple-300"
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
                className="flex flex-col rounded-xl border border-white/10 bg-[#1F1F1F] p-6"
              >
                <p className="flex-1 leading-relaxed text-white/85">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-6">
                  {t.photoUrls?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- remote customer photos
                    <img
                      src={t.photoUrls[0]}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-400">
                      {t.customerName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white">{t.customerName}</p>
                    <p className="text-sm text-white/50">Customer</p>
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
          <div className="mt-12 rounded-xl border border-white/10 bg-[#1F1F1F] px-8 py-12 text-center">
            <h2 className="text-xl font-bold text-white">
              Share Your Experience
            </h2>
            <p className="mt-2 text-white/60">
              Loved shopping with us? We&apos;d love to hear from you.
            </p>
            <Link
              href="/testimonials/submit"
              className="mt-6 inline-block rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Write a Testimonial
            </Link>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/about"
              className="font-semibold text-purple-400 hover:text-purple-300"
            >
              About us
            </Link>
          </div>
        </>
      )}
    </DarkTrendGeneralLayout>
  );
}
