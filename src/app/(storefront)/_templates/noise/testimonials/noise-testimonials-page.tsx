import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";
import { FadeIn, PageTransition } from "~/components/page-animations";

import { resolveFields } from "../index";

/* Pull the first sentence from a testimonial as a display headline */
function extractHeadline(text: string): string {
  const sentence = /^[^.!?]+[.!?]/.exec(text)?.[0] ?? text.slice(0, 72);
  return sentence.length > 72 ? sentence.slice(0, 72) + "…" : sentence;
}

export async function NoiseTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, [
    "noise.homepage-testimonials-heading",
    "noise.testimonials.page-overline",
    "noise.testimonials.page-intro",
    "noise.testimonials.cta-overline",
    "noise.testimonials.cta-heading",
    "noise.testimonials.cta-body",
    "noise.testimonials.empty-state-text",
  ]);
  const heading =
    (f["noise.homepage-testimonials-heading"] ?? "").trim() || "Testimonials";
  const pageOverline =
    f["noise.testimonials.page-overline"] ?? "From the people wearing it";
  const pageIntro =
    f["noise.testimonials.page-intro"] ??
    "Unedited notes from our customers. We publish every review we receive — high and low.";
  const ctaOverline =
    f["noise.testimonials.cta-overline"] ?? "Wearing something of ours?";
  const ctaHeading =
    f["noise.testimonials.cta-heading"] ?? "Tell us how it's holding up.";
  const ctaBody =
    f["noise.testimonials.cta-body"] ??
    "We read every note that comes in. Honest feedback — the awkward kind included — is how we know what to make next.";
  const emptyStateText =
    f["noise.testimonials.empty-state-text"] ??
    "No voices yet. Check back soon.";
  const count = testimonials.length;

  /* Star distribution — use testimonial rating if available, otherwise assume 5 */
  type TestimonialWithRating = (typeof testimonials)[number] & {
    rating?: number;
  };
  const withRatings = testimonials as TestimonialWithRating[];
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    n: withRatings.filter((t) => (t.rating ?? 5) === star).length,
  }));
  const avgRating =
    count > 0
      ? (
          withRatings.reduce((sum, t) => sum + (t.rating ?? 5), 0) / count
        ).toFixed(1)
      : "5.0";

  return (
    <PageTransition>
      {/* ── Centered header ── */}
      <section
        className="border-foreground/15 border-b px-6 pt-20 pb-14 text-center"
        style={{ background: "var(--vn-paper)" }}
        {...sectionGroupAttr("testimonials", "page")}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "1280px" }}>
          <p
            className="mb-4 font-mono text-[10px] tracking-[0.28em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
            {...fieldAttr("noise.testimonials.page-overline")}
          >
            {pageOverline}
          </p>
          <h1
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(3.5rem, 8vw, 6rem)",
              letterSpacing: "-0.025em",
            }}
            {...fieldAttr("noise.homepage-testimonials-heading")}
          >
            {heading}
          </h1>
          <p
            className="mx-auto mt-6 font-sans leading-[1.85]"
            style={{
              fontSize: "15px",
              color: "var(--vn-ink-soft)",
              maxWidth: "52ch",
            }}
            {...fieldAttr("noise.testimonials.page-intro")}
          >
            {pageIntro}
          </p>
        </FadeIn>
      </section>

      {/* ── Masonry grid — CSS columns matching design ── */}
      <section className="px-7 py-12" style={{ background: "var(--vn-paper)" }}>
        {testimonials.length === 0 ? (
          <FadeIn className="py-20 text-center">
            <p
              className="font-serif text-2xl italic"
              style={{ color: "var(--vn-steel-mist)" }}
              {...fieldAttr("noise.testimonials.empty-state-text")}
            >
              {emptyStateText}
            </p>
            <Link href="/" className="vn-stamp mt-8 inline-flex text-[10px]">
              Back to home
            </Link>
          </FadeIn>
        ) : (
          <div
            style={{ columnCount: 3, columnGap: "24px" }}
            className="hidden md:block"
          >
            {testimonials.map((t, i) => (
              <TestimonialCard key={t.id} t={t} i={i} />
            ))}
          </div>
        )}

        {/* Mobile: single column */}
        {testimonials.length > 0 && (
          <div className="flex flex-col gap-5 md:hidden">
            {testimonials.map((t, i) => (
              <TestimonialCard key={t.id} t={t} i={i} />
            ))}
          </div>
        )}
      </section>

      {/* ── Dark CTA — "Wearing something of ours?" ── */}
      <section
        className="border-foreground border-y-2 px-7 py-20 text-center"
        style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
        {...sectionGroupAttr("testimonials", "page")}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "780px" }}>
          <p
            className="mb-5 font-mono text-[9.5px] tracking-[0.28em] uppercase"
            style={{ opacity: 0.55 }}
            {...fieldAttr("noise.testimonials.cta-overline")}
          >
            {ctaOverline}
          </p>
          <h2
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              letterSpacing: "-0.02em",
            }}
            {...fieldAttr("noise.testimonials.cta-heading")}
          >
            {ctaHeading}
          </h2>
          <p
            className="mx-auto mt-5 font-sans leading-[1.85]"
            style={{ fontSize: "14px", opacity: 0.78, maxWidth: "48ch" }}
            {...fieldAttr("noise.testimonials.cta-body")}
          >
            {ctaBody}
          </p>
          <Link
            href="/testimonials/submit"
            className="vn-focus-on-dark mt-8 inline-block font-mono uppercase transition-opacity hover:opacity-80"
            style={{
              fontSize: "11px",
              letterSpacing: ".24em",
              padding: "14px 32px",
              background: "var(--vn-bone)",
              color: "var(--vn-ink)",
              border: "1px solid var(--vn-bone)",
            }}
          >
            Write a testimonial
          </Link>
        </FadeIn>
      </section>
    </PageTransition>
  );
}

/* ── Card component — server-safe ── */
type TWithRating = Awaited<ReturnType<typeof api.testimonial.list>>[number] & {
  rating?: number;
  productName?: string;
};

function TestimonialCard({ t, i }: { t: TWithRating; i: number }) {
  const stars = t.rating ?? 5;
  const headline = extractHeadline(t.text);
  const body =
    t.text.length > headline.replace(/[.!?]$/, "").length ? t.text : t.text;

  return (
    <div
      style={{
        breakInside: "avoid",
        marginBottom: "24px",
        border: "1px solid var(--vn-rule)",
        background: "var(--vn-paper)",
        padding: "26px 26px 22px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Stars + date */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontSize: "14px",
            letterSpacing: "0.16em",
            color: "var(--vn-ink)",
          }}
        >
          {"★".repeat(stars)}
          <span style={{ color: "var(--vn-rule)" }}>
            {"★".repeat(5 - stars)}
          </span>
        </span>
        <span className="sr-only">Rated {stars} out of 5 stars</span>
        <span
          className="font-mono text-[10px] tracking-[0.14em] uppercase"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          {String(i + 1).padStart(2, "0")}
        </span>
      </div>

      {/* Headline */}
      <h3
        className="font-serif leading-[1.25] italic"
        style={{
          fontSize: "22px",
          letterSpacing: "-0.005em",
          color: "var(--vn-ink)",
        }}
      >
        &ldquo;{headline}&rdquo;
      </h3>

      {/* Body */}
      <p
        className="font-sans text-[13px] leading-[1.75]"
        style={{ color: "var(--vn-ink-soft)" }}
      >
        {body}
      </p>

      {/* Customer photo thumbnails */}
      {t.photoUrls && t.photoUrls.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {t.photoUrls.slice(0, 4).map((url, pi) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={pi}
              src={url}
              alt=""
              style={{
                width: "48px",
                height: "48px",
                objectFit: "cover",
                border: "1px solid var(--vn-rule)",
              }}
            />
          ))}
        </div>
      )}

      {/* Footer — name + location + product */}
      <div
        style={{
          borderTop: "1px solid var(--vn-line-soft)",
          paddingTop: "16px",
          marginTop: "4px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div>
          <p
            className="font-mono text-[11px] tracking-[0.14em] uppercase"
            style={{ color: "var(--vn-ink)", fontWeight: 500 }}
          >
            {t.customerName}
          </p>
          {(t.customerTitle ?? t.customerCompany) && (
            <p
              className="mt-0.5 font-mono text-[10px] tracking-[0.14em] uppercase"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              {t.customerTitle ?? t.customerCompany}
            </p>
          )}
        </div>
        <span
          className="flex-shrink-0 text-right font-mono text-[9.5px] tracking-[0.14em] uppercase"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          Verified buyer
        </span>
      </div>

      {/* Product name (if available) */}
      {t.productName && (
        <p
          className="font-mono text-[10px] tracking-[0.14em] uppercase"
          style={{ color: "var(--vn-steel-mist)", marginTop: "-4px" }}
        >
          On · {t.productName}
        </p>
      )}
    </div>
  );
}
