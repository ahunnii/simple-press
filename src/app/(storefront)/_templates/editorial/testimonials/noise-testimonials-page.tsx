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

const PROCESS_STEPS = [
  {
    n: "01",
    title: "You buy a piece.",
    body: "Every order ships with a hand-numbered tag and a postcard from the studio. The postcard has a pre-printed return address.",
  },
  {
    n: "02",
    title: "You wear it.",
    body: "Six weeks, three weeks, a season — whatever feels right. Wash it, drape it, get caught in a Detroit rain. We want the real review, not the unboxing.",
  },
  {
    n: "03",
    title: "You write back.",
    body: "Tell us what worked, what didn't, where you wore it. Quick email or a form below — both go to the same shelf above the cutting table.",
  },
  {
    n: "04",
    title: "We listen.",
    body: "The wrap suit had its hem shortened twice after readers told us so. Your words become next season's patterns.",
  },
] as const;

/* Cards cycle through three bg styles */
const CARD_STYLES = ["paper", "ink", "steel"] as const;

type CardStyle = (typeof CARD_STYLES)[number];

function cardStyle(style: CardStyle) {
  if (style === "ink")
    return { background: "var(--vn-ink)", color: "var(--vn-bone)" };
  if (style === "steel")
    return { background: "var(--vn-steel)", color: "var(--vn-bone)" };
  return { background: "var(--vn-paper)", color: "var(--vn-ink)" };
}

function mutedColor(style: CardStyle) {
  return style === "paper" ? "var(--vn-steel-mist)" : "rgba(255,255,255,0.5)";
}

export async function NoiseTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });
  const customFields = business.siteContent?.customFields as
    | Record<string, string>
    | undefined;
  const f = resolveFields(customFields, ["noise.homepage-testimonials-heading"]);
  const heading = (f["noise.homepage-testimonials-heading"] ?? "").trim() || "Worn out loud.";
  const featured = testimonials[0];

  return (
    <PageTransition>
      {/* Two-column editorial header */}
      <section
        className="grid border-b-2 border-foreground md:grid-cols-2"
        style={{ background: "var(--vn-paper)" }}
      >
        {/* Left — heading + stats */}
        <FadeIn className="flex flex-col gap-8 px-7 py-14 border-b border-foreground md:border-b-0 md:border-r">
          <div className="flex flex-col gap-4">
            <p
              className="font-mono text-[9.5px] tracking-[0.22em] uppercase"
              style={{ color: "var(--vn-steel)" }}
            >
              Section / 06 — From the people wearing it
            </p>
            <h1
              className="font-serif italic leading-[0.95] tracking-tight"
              style={{
                fontSize: "clamp(3rem, 6vw, 5.5rem)",
                letterSpacing: "-0.025em",
              }}
            >
              {heading}
            </h1>
            <p
              className="font-sans text-[15px] leading-relaxed max-w-[42ch]"
              style={{ color: "var(--vn-ink-soft)" }}
            >
              Voices from the people in our garments — unedited, lightly
              punctuated, signed with the city they sent it from.
            </p>
          </div>

          {/* Stats row */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t pt-6"
            style={{ borderColor: "var(--vn-rule)" }}
          >
            {[
              { k: String(testimonials.length || "1,247"), v: "Voices on file" },
              { k: "4.9", v: "Average signal" },
              { k: "96%", v: "Buy again" },
              { k: "42", v: "Cities" },
            ].map((stat, i) => (
              <div
                key={i}
                className="flex flex-col gap-1 pr-4"
                style={{ borderRight: i < 3 ? "1px solid var(--vn-rule)" : "none" }}
              >
                <span
                  className="font-serif italic leading-none"
                  style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.4rem)", letterSpacing: "-0.02em" }}
                >
                  {stat.k}
                </span>
                <span
                  className="font-mono text-[9px] tracking-[0.18em] uppercase"
                  style={{ color: "var(--vn-steel)" }}
                >
                  {stat.v}
                </span>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Right — featured quote */}
        {featured ? (
          <FadeIn
            delay={0.1}
            className="flex flex-col justify-between gap-6 px-8 py-14"
            style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
          >
            <div
              className="font-serif italic leading-none"
              style={{ fontSize: "80px", opacity: 0.25, lineHeight: 0.8 }}
            >
              &ldquo;
            </div>
            <p
              className="font-serif italic leading-[1.3] flex-1"
              style={{
                fontSize: "clamp(1.3rem, 2vw, 1.8rem)",
                letterSpacing: "-0.01em",
              }}
            >
              {featured.text}
            </p>
            <div className="flex items-end justify-between">
              <div>
                <div
                  className="font-mono text-[11px] tracking-[0.14em] uppercase"
                  style={{ color: "var(--vn-bone)" }}
                >
                  {featured.customerName}
                </div>
                <div
                  className="font-mono text-[9.5px] tracking-[0.2em] uppercase mt-1"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  ★★★★★ · Verified buyer
                </div>
              </div>
            </div>
          </FadeIn>
        ) : (
          <div
            className="flex items-center justify-center px-8 py-14"
            style={{ background: "var(--vn-steel)" }}
          >
            <p
              className="font-serif italic text-center"
              style={{ fontSize: "28px", color: "var(--vn-bone)", opacity: 0.4 }}
            >
              More voices coming.
            </p>
          </div>
        )}
      </section>

      {/* Filter row */}
      <div
        className="flex items-center gap-4 border-b border-foreground/20 px-7 py-3 overflow-x-auto"
        style={{ background: "var(--vn-paper)" }}
      >
        <div
          className="font-serif italic"
          style={{ fontSize: "20px", color: "var(--vn-ink)", letterSpacing: "-0.01em", flexShrink: 0 }}
        >
          ★★★★★
        </div>
        <span
          className="font-mono text-[22px] tracking-tight"
          style={{ color: "var(--vn-ink)", letterSpacing: "-0.02em", fontStyle: "italic" }}
        >
          4.9
        </span>
        <span
          className="font-mono text-[9.5px] tracking-[0.14em] uppercase"
          style={{ color: "var(--vn-steel)" }}
        >
          based on {testimonials.length || "1,247"} verified buyers
        </span>
        <div className="ml-auto flex gap-2 flex-shrink-0">
          {["All voices", "★★★★★", "By piece"].map((pill, i) => (
            <span
              key={pill}
              className="vn-stamp text-[9.5px] cursor-pointer"
              style={
                i === 0
                  ? { background: "var(--vn-ink)", color: "var(--vn-bone)", borderColor: "var(--vn-ink)" }
                  : {}
              }
            >
              {pill}
            </span>
          ))}
        </div>
      </div>

      {/* Voices grid */}
      <section className="px-7 py-12" style={{ background: "var(--vn-paper)" }}>
        {testimonials.length === 0 ? (
          <FadeIn className="py-20 text-center">
            <p
              className="font-serif italic text-2xl"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              No voices yet. Check back soon.
            </p>
            <Link
              href="/"
              className="vn-stamp mt-8 inline-flex text-[10px]"
            >
              Back to home
            </Link>
          </FadeIn>
        ) : (
          <StaggerContainer
            className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.07}
          >
            {testimonials.map((t, i) => {
              const style = CARD_STYLES[i % 3] ?? "paper";
              const cs = cardStyle(style);
              const muted = mutedColor(style);

              return (
                <StaggerItem key={t.id}>
                  <article
                    className="flex flex-col gap-4 border border-foreground/15 p-5 h-full"
                    style={cs}
                  >
                    {/* Top: edition + stars */}
                    <div className="flex items-center justify-between">
                      <span
                        className="font-mono text-[9px] tracking-[0.18em] uppercase"
                        style={{ color: muted }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ color: muted, fontSize: "12px" }}>
                        ★★★★★
                      </span>
                    </div>

                    {/* Quote */}
                    <p
                      className="font-serif italic leading-[1.35] flex-1"
                      style={{ fontSize: "18px", letterSpacing: "-0.005em" }}
                    >
                      &ldquo;{t.text}&rdquo;
                    </p>

                    {/* Customer photo thumbnails */}
                    {t.photoUrls && t.photoUrls.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {t.photoUrls.slice(0, 4).map((url, pi) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={pi}
                            src={url}
                            alt=""
                            className="object-cover"
                            style={{ width: "48px", height: "48px", border: "1px solid", borderColor: muted }}
                          />
                        ))}
                      </div>
                    )}

                    {/* Footer: name + location */}
                    <div
                      className="flex items-end justify-between border-t pt-4 gap-4"
                      style={{ borderColor: muted, opacity: 0.9 }}
                    >
                      <span
                        className="font-mono text-[10.5px] tracking-[0.14em] uppercase"
                      >
                        {t.customerName}
                      </span>
                      <span
                        className="font-mono text-[9px] tracking-[0.14em] uppercase text-right"
                        style={{ color: muted }}
                      >
                        Verified buyer
                      </span>
                    </div>
                  </article>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </section>

      {/* How reviews work — 4-step process */}
      <section
        className="border-y-2 border-foreground px-7 py-16"
        style={{ background: "var(--vn-bone)" }}
      >
        <FadeIn className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p
              className="font-mono text-[9.5px] tracking-[0.22em] uppercase mb-3"
              style={{ color: "var(--vn-steel)" }}
            >
              How voices work
            </p>
            <h2
              className="font-serif italic leading-none tracking-tight"
              style={{ fontSize: "clamp(2rem, 4vw, 3.5rem)", letterSpacing: "-0.02em" }}
            >
              How we collect them.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {PROCESS_STEPS.map((step) => (
              <div key={step.n}>
                <div
                  className="font-mono text-[11px] tracking-[0.22em] uppercase mb-3 flex items-center justify-center border"
                  style={{
                    width: "32px",
                    height: "32px",
                    background: "var(--vn-ink)",
                    color: "var(--vn-bone)",
                    borderColor: "var(--vn-ink)",
                  }}
                >
                  {step.n}
                </div>
                <h4
                  className="font-serif italic leading-none mb-3"
                  style={{ fontSize: "22px", letterSpacing: "-0.01em" }}
                >
                  {step.title}
                </h4>
                <p
                  className="font-sans text-sm leading-relaxed"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* CTA */}
      <section
        className="border-b-2 border-foreground px-7 py-20"
        style={{ background: "var(--vn-steel)", color: "var(--vn-bone)" }}
      >
        <FadeIn className="mx-auto max-w-7xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p
              className="font-mono text-[9.5px] tracking-[0.22em] uppercase mb-4"
              style={{ color: "var(--vn-steel-mist)" }}
            >
              Your turn
            </p>
            <h2
              className="font-serif italic leading-none tracking-tight"
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4rem)",
                letterSpacing: "-0.02em",
              }}
            >
              Write to us.
            </h2>
            <p
              className="mt-4 font-sans text-[15px] leading-relaxed max-w-[38ch]"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Owned a piece? Worn it somewhere memorable? We&apos;d like to hear
              about it.
            </p>
          </div>
          <Link
            href="/testimonials/submit"
            className="vn-stamp flex-shrink-0 text-[11px] transition-all hover:opacity-80"
            style={{
              borderColor: "var(--vn-bone)",
              color: "var(--vn-bone)",
              padding: "14px 22px",
            }}
          >
            Write a testimonial →
          </Link>
        </FadeIn>
      </section>
    </PageTransition>
  );
}
