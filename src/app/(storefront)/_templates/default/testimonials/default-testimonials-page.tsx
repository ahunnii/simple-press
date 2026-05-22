import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { api } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

function StarRow({ count = 5 }: { count?: number }) {
  return (
    <span aria-hidden className="tracking-[2px] text-[#0a0a0a]">
      {"★".repeat(count)}
      {"☆".repeat(5 - count)}
    </span>
  );
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

export async function DefaultTestimonialsPage(
  _props: DefaultTestimonialsPageTemplateProps,
) {
  const testimonials = await api.testimonial.list({ publicOnly: true });
  const total = testimonials.length;

  return (
    <PageTransition>

      {/* ── Page hero ────────────────────────────────────────────────────── */}
      <section className="border-b border-[#e8e8e8] px-6 pt-20 pb-14 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-5 flex items-center gap-2 text-[11px] font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
            <Link href="/" className="hover:text-[#0a0a0a] transition-colors">
              Home
            </Link>
            <span>/</span>
            <span>Reviews</span>
          </div>
          <span className="text-xs font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
            From customers
          </span>
          <h1 className="font-serif mt-3 text-[clamp(40px,5vw,72px)] font-semibold leading-[1.04] tracking-[-0.03em]">
            What people say.
          </h1>
          <p className="mt-4 text-[17px] text-[#6b6b6b]">
            Real reviews from real orders.
          </p>
        </div>
      </section>

      {/* ── Summary bar ──────────────────────────────────────────────────── */}
      {total > 0 && (
        <section className="border-b border-[#e8e8e8] px-6 py-10 lg:px-8">
          <div className="mx-auto max-w-[1440px] flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
            <span className="font-serif text-5xl font-semibold tracking-tight">
              ★
            </span>
            <div>
              <p className="text-sm font-medium">Verified reviews</p>
              <p className="text-sm text-[#6b6b6b]">
                {total} review{total !== 1 ? "s" : ""} from verified buyers
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Review grid ──────────────────────────────────────────────────── */}
      <section className="px-6 py-16 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          {testimonials.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-[#6b6b6b]">
                No reviews yet — check back soon!
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium border-b border-current pb-0.5 transition-[gap] hover:gap-3"
              >
                Back to home →
              </Link>
            </div>
          ) : (
            <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="mb-5 break-inside-avoid rounded-[var(--radius)] border border-[#e8e8e8] p-6"
                >
                  <StarRow />
                  <p className="mt-3 text-[15px] leading-[1.65]">{t.text}</p>
                  {t.photoUrls.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {t.photoUrls.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="h-16 w-16 rounded-[var(--radius)] object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#e8e8e8] pt-4">
                    <div>
                      <p className="text-sm font-medium">{t.customerName}</p>
                      {t.customerTitle && (
                        <p className="text-xs text-[#6b6b6b]">
                          {t.customerTitle}
                        </p>
                      )}
                    </div>
                    <time
                      dateTime={new Date(t.testimonialDate).toISOString()}
                      className="text-xs text-[#6b6b6b] shrink-0"
                    >
                      {formatDate(t.testimonialDate)}
                    </time>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Submit CTA ───────────────────────────────────────────────────── */}
      <section className="bg-[#efece8] px-6 py-20 text-center lg:px-8">
        <div className="mx-auto max-w-[640px]">
          <span className="text-xs font-medium tracking-[0.14em] uppercase text-[#6b6b6b]">
            Recent purchase?
          </span>
          <h2 className="font-serif mt-3 text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.02em]">
            Tell us how it went.
          </h2>
          <p className="mt-4 text-[15px] text-[#6b6b6b]">
            Reviews help other shoppers find what they need — and tell us what
            to make more of.
          </p>
          <div className="mt-8">
            <Link
              href="/testimonials/submit"
              className="inline-flex h-12 items-center justify-center rounded-[var(--radius)] bg-[#0a0a0a] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
            >
              Write a review
            </Link>
          </div>
        </div>
      </section>

    </PageTransition>
  );
}
