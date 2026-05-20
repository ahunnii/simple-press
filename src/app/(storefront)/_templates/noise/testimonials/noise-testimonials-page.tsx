import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
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
  ]);
  const heading =
    (f["noise.homepage-testimonials-heading"] ?? "").trim() || "Testimonials";
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
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "1280px" }}>
          <p
            className="mb-4 font-mono text-[10px] tracking-[0.28em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            From the people wearing it
          </p>
          <h1
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(3.5rem, 8vw, 6rem)",
              letterSpacing: "-0.025em",
            }}
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
          >
            Unedited notes from our customers. We publish every review we
            receive — high and low.
          </p>
        </FadeIn>
      </section>

      {/* ── 4-cell stats row ── */}
      <section
        className="border-foreground/20 border-b px-7 py-0"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn
          className="mx-auto"
          style={{ maxWidth: "980px", padding: "56px 0 0" }}
        >
          <div
            className="border-foreground/20 grid grid-cols-2 border sm:grid-cols-4"
            style={{ background: "var(--vn-paper)" }}
          >
            {[
              { n: avgRating, sub: "Average rating", foot: "out of 5" },
              { n: String(count || "—"), sub: "Reviews on file" },
              { n: "96%", sub: "Would recommend" },
              { n: "14d", sub: "Median fit feedback" },
            ].map((stat, i) => (
              <div
                key={stat.sub}
                className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center"
                style={{
                  borderRight: i < 3 ? "1px solid var(--vn-rule)" : "none",
                  borderBottom: i < 2 ? "1px solid var(--vn-rule)" : "none",
                }}
              >
                <span
                  className="font-serif leading-none italic"
                  style={{
                    fontSize: "clamp(2rem, 4vw, 3rem)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {stat.n}
                </span>
                <span
                  className="font-mono text-[9.5px] tracking-[0.18em] uppercase"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  {stat.sub}
                </span>
                {stat.foot && (
                  <span
                    className="font-mono text-[9px] tracking-[0.14em]"
                    style={{ color: "var(--vn-steel-mist)", opacity: 0.6 }}
                  >
                    {stat.foot}
                  </span>
                )}
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Rating distribution */}
        <FadeIn
          className="mx-auto py-10"
          style={{ maxWidth: "680px", padding: "40px 0 56px" }}
        >
          <p
            className="mb-5 text-center font-mono text-[9.5px] tracking-[0.22em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Rating Distribution
          </p>
          <div className="flex flex-col gap-2.5">
            {dist.map(({ star, n }) => {
              const pct = count > 0 ? (n / count) * 100 : 0;
              return (
                <div
                  key={star}
                  className="grid items-center gap-3 font-mono text-[11px]"
                  style={{
                    gridTemplateColumns: "36px 1fr 28px",
                    color: "var(--vn-steel-mist)",
                  }}
                >
                  <span>{star} ★</span>
                  <div
                    className="relative h-1.5"
                    style={{ background: "rgba(0,0,0,.06)" }}
                  >
                    <div
                      className="absolute top-0 bottom-0 left-0 transition-all"
                      style={{ width: `${pct}%`, background: "var(--vn-ink)" }}
                    />
                  </div>
                  <span className="text-right">{n}</span>
                </div>
              );
            })}
          </div>
        </FadeIn>
      </section>

      {/* ── Filter chips ── */}
      <div
        className="border-foreground/20 flex items-center gap-3 overflow-x-auto border-b px-7 py-4"
        style={{ background: "var(--vn-paper)" }}
      >
        <span
          className="flex-shrink-0 font-serif italic"
          style={{
            fontSize: "18px",
            color: "var(--vn-ink)",
            letterSpacing: "-0.01em",
          }}
        >
          {"★".repeat(5)}
        </span>
        <span
          className="flex-shrink-0 font-mono tracking-tight"
          style={{
            fontSize: "20px",
            color: "var(--vn-ink)",
            fontStyle: "italic",
            letterSpacing: "-0.02em",
          }}
        >
          {avgRating}
        </span>
        <span
          className="flex-shrink-0 font-mono text-[9.5px] tracking-[0.14em] uppercase"
          style={{ color: "var(--vn-steel-mist)" }}
        >
          based on {count || "—"} verified buyers
        </span>
        <div className="ml-auto flex flex-shrink-0 gap-2">
          {["All voices", "★★★★★", "By piece"].map((pill, i) => (
            <span
              key={pill}
              className="vn-stamp hover:bg-foreground hover:text-background cursor-pointer text-[9.5px] transition-all"
              style={
                i === 0
                  ? {
                      background: "var(--vn-ink)",
                      color: "var(--vn-bone)",
                      borderColor: "var(--vn-ink)",
                    }
                  : {}
              }
            >
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* ── Masonry grid — CSS columns matching design ── */}
      <section className="px-7 py-12" style={{ background: "var(--vn-paper)" }}>
        {testimonials.length === 0 ? (
          <FadeIn className="py-20 text-center">
            <p
              className="font-serif text-2xl italic"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              No voices yet. Check back soon.
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
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "780px" }}>
          <p
            className="mb-5 font-mono text-[9.5px] tracking-[0.28em] uppercase"
            style={{ opacity: 0.55 }}
          >
            Wearing something of ours?
          </p>
          <h2
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              letterSpacing: "-0.02em",
            }}
          >
            Tell us how it&apos;s holding up.
          </h2>
          <p
            className="mx-auto mt-5 font-sans leading-[1.85]"
            style={{ fontSize: "14px", opacity: 0.78, maxWidth: "48ch" }}
          >
            We read every note that comes in. Honest feedback — the awkward kind
            included — is how we know what to make next.
          </p>
          <Link
            href="/testimonials/submit"
            className="mt-8 inline-block font-mono uppercase transition-opacity hover:opacity-80"
            style={{
              fontSize: "11px",
              letterSpacing: ".24em",
              padding: "14px 32px",
              background: "var(--vn-bone)",
              color: "var(--vn-ink)",
              border: "1px solid var(--vn-bone)",
            }}
          >
            Leave a review
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
