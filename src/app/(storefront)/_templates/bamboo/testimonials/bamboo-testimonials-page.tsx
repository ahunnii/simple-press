/* eslint-disable @next/next/no-img-element -- remote customer-uploaded photos */
import Link from "next/link";

import type { DefaultTestimonialsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";

import { resolveFields } from "../";
import { BambooEdge } from "../shared/bamboo-edge";
import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooReveal, BambooRevealGroup } from "../shared/bamboo-reveal";

/**
 * Avatar in the wreath register (WREATH-EVERYWHERE, decisions log
 * 2026-08-31): her mark takes every brand role, and the sprout badge never
 * stands in for a person. Three variants cycle so a grid of bubbles never
 * reads stamped. A real customer photo, when one exists, always wins — it is
 * DB content, and the wreath is what stands in when there is none.
 *
 * Variants 2 and 3 are composed here rather than pulled from the sprite: they
 * are our OWN positive-origin viewBoxes with `<use href="#wreathRing">`
 * inside, never a symbol's negative-origin viewBox on the wrapper.
 */
function BambooQuoteAvatar({
  index,
  photoUrl,
}: {
  index: number;
  photoUrl?: string;
}) {
  if (photoUrl) {
    return (
      <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[var(--bamboo-outline)] bg-[var(--bamboo-roll)]">
        <img
          src={photoUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </span>
    );
  }

  const variant = index % 3;

  if (variant === 0) {
    return (
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--bamboo-outline)] bg-[var(--bamboo-sage)]">
        <BambooGlyph id="s-wreath" className="h-7 w-auto" />
      </span>
    );
  }

  return (
    <svg
      viewBox="0 0 72 72"
      className="h-12 w-12 shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="36"
        cy="36"
        r="35"
        fill={
          variant === 1 ? "var(--bamboo-ill-pot)" : "var(--bamboo-ill-leaf-mid)"
        }
      />
      <g transform="translate(39,39) scale(0.5)">
        <use href="#wreathRing" />
      </g>
    </svg>
  );
}

/** ±1° alternation across the grid — bubbles pinned to a board, not a table. */
function bubbleRotation(index: number): "left" | "right" | undefined {
  const variant = index % 3;
  if (variant === 0) return "left";
  if (variant === 2) return "right";
  return undefined;
}

export async function BambooTestimonialsPage({
  business,
}: DefaultTestimonialsPageTemplateProps) {
  const testimonials = await api.testimonial.list({ publicOnly: true });

  const f = resolveFields(business?.siteContent?.customFields, [
    "bamboo.testimonials-page.heading",
    "bamboo.testimonials-page.subheading",
  ]);

  const heading = f["bamboo.testimonials-page.heading"] ?? "";
  const subheading = f["bamboo.testimonials-page.subheading"] ?? "";

  return (
    <>
      {/* ── Sage hero band ─────────────────────────────────────────────── */}
      <section
        {...sectionGroupAttr("testimonials", "page")}
        aria-labelledby="bamboo-testimonials-heading"
        className="relative flex items-center overflow-hidden"
        style={{
          background: "var(--bamboo-sage)",
          marginTop: "calc(var(--bamboo-header-offset) * -1)",
          minHeight: "min(34vh, 380px)",
          paddingTop:
            "calc(var(--bamboo-header-offset) + clamp(34px, 4vw, 58px))",
          paddingBottom: "clamp(46px, 5.4vw, 82px)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          {/* one edge anchor: a crownless culm rooted off the right edge */}
          <span className="hidden md:block">
            <span
              className="bamboo-el bamboo-el--b"
              style={
                {
                  "--w": "132px",
                  "--l": "auto",
                  "--b": "-160px",
                  "--d": "0.24s",
                  right: "-2.6%",
                } as React.CSSProperties
              }
            >
              <span
                className="bamboo-sway"
                style={
                  {
                    "--dur": "9.4s",
                    "--dl": "-3.2s",
                    "--a1": "0.5deg",
                    "--a2": "-0.6deg",
                  } as React.CSSProperties
                }
              >
                <BambooGlyph id="s-culm-run" />
              </span>
            </span>
          </span>

          <span
            className="bamboo-drift"
            style={
              {
                "--l": "34%",
                "--t": "3%",
                "--w": "27px",
                "--dur": "17s",
                "--dl": "-4s",
                "--dx": "96px",
                "--dy": "310px",
                "--dr": "165deg",
              } as React.CSSProperties
            }
          >
            <BambooGlyph id="s-leaf" />
          </span>
          <span className="hidden md:block">
            <span
              className="bamboo-drift"
              style={
                {
                  "--l": "58%",
                  "--t": "-2%",
                  "--w": "22px",
                  "--dur": "21s",
                  "--dl": "-12s",
                  "--dx": "-74px",
                  "--dy": "340px",
                  "--dr": "-155deg",
                } as React.CSSProperties
              }
            >
              <BambooGlyph id="s-leaf-l" />
            </span>
          </span>
        </div>

        <div className="relative mx-auto w-full max-w-[1200px] px-6">
          <h1
            id="bamboo-testimonials-heading"
            className="font-heading max-w-[16ch] text-[clamp(2.3rem,4.4vw,3.5rem)] leading-[1.06] font-bold tracking-[-0.026em] text-balance text-[var(--bamboo-pine)]"
            {...fieldAttr("bamboo.testimonials-page.heading")}
          >
            {heading}
          </h1>
          {subheading ? (
            <p
              className="mt-[18px] max-w-[40ch] text-[1.08rem] leading-[1.6] text-[var(--bamboo-ink)]"
              {...fieldAttr("bamboo.testimonials-page.subheading")}
            >
              {subheading}
            </p>
          ) : null}
        </div>
      </section>

      <BambooEdge
        from="sage"
        to="paper"
        variant="b"
        leaves={[
          { id: "s-leaf-d", l: "18%", t: "8%", w: "26px", r: "-20deg" },
          { id: "s-leaf", l: "52%", t: "30%", w: "22px", r: "14deg" },
          { id: "s-leaf-l", l: "79%", t: "4%", w: "24px", r: "-8deg" },
        ]}
      />

      {/* ── The board of bubbles ───────────────────────────────────────── */}
      <section className="pt-[clamp(30px,3.6vw,54px)] pb-[clamp(58px,6vw,96px)]">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          {testimonials.length === 0 ? (
            <BambooReveal className="mx-auto max-w-[560px]">
              <div className="bamboo-torn-card text-center">
                <BambooGlyph
                  id="s-sprig"
                  className="mx-auto mt-3 h-16 w-auto"
                />
                <p className="font-heading mt-4 text-[1.35rem] font-semibold text-[var(--bamboo-pine)]">
                  No testimonials yet
                </p>
                <p className="mx-auto mt-2 max-w-[38ch] text-[0.98rem] leading-relaxed text-[var(--bamboo-ink-soft)]">
                  Kind words land here as soon as customers share them. Yours
                  could be the first.
                </p>
              </div>
            </BambooReveal>
          ) : (
            <BambooRevealGroup className="grid items-start gap-8 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t, i) => {
                const avatarPhoto = t.photoUrls[0];
                const extraPhotos = t.photoUrls.slice(1, 5);
                const attribution = [t.customerTitle, t.customerCompany]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <blockquote
                    key={t.id}
                    className="bamboo-bubble bamboo-reveal-item"
                    data-rotate={bubbleRotation(i)}
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    {t.title ? (
                      <p className="font-heading text-[1.05rem] leading-snug font-semibold text-[var(--bamboo-pine)]">
                        {t.title}
                      </p>
                    ) : null}
                    <p
                      className={cn(
                        "text-[1.1rem] leading-[1.55] text-[var(--bamboo-ink)]",
                        t.title && "mt-2",
                      )}
                    >
                      &ldquo;{t.text}&rdquo;
                    </p>

                    {extraPhotos.length > 0 ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {extraPhotos.map((url) => (
                          <img
                            key={url}
                            src={url}
                            alt=""
                            loading="lazy"
                            className="h-14 w-14 rounded-xl border-2 border-[var(--bamboo-outline)] object-cover"
                          />
                        ))}
                      </div>
                    ) : null}

                    <footer className="mt-[22px] flex items-center gap-3">
                      <BambooQuoteAvatar index={i} photoUrl={avatarPhoto} />
                      <div className="min-w-0">
                        <p className="text-[0.95rem] font-medium text-[var(--bamboo-ink-soft)]">
                          {t.customerName}
                        </p>
                        {attribution ? (
                          <p className="text-[0.82rem] text-[var(--bamboo-muted)]">
                            {attribution}
                          </p>
                        ) : null}
                      </div>
                    </footer>
                  </blockquote>
                );
              })}
            </BambooRevealGroup>
          )}

          {/* ── Invitation ───────────────────────────────────────────── */}
          <BambooReveal className="mx-auto mt-[clamp(44px,5vw,76px)] max-w-[620px]">
            <div className="bamboo-torn-card text-center">
              <BambooGlyph id="s-wreath" className="mx-auto mt-2 h-11 w-auto" />
              <h2 className="font-heading mt-3 text-[clamp(1.5rem,2.4vw,2rem)] font-bold tracking-[-0.018em] text-[var(--bamboo-pine)]">
                Share Your Experience
              </h2>
              <p className="mx-auto mt-3 max-w-[42ch] text-[1rem] leading-relaxed text-[var(--bamboo-ink-soft)]">
                Loved shopping with us? We&apos;d love to hear from you.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
                <Link
                  href="/testimonials/submit"
                  className="bamboo-btn bamboo-btn-primary"
                >
                  Write a Testimonial
                </Link>
                {testimonials.length > 0 ? (
                  <Link href="/shop" className="bamboo-btn bamboo-btn-ghost">
                    Shop the Collection
                  </Link>
                ) : null}
              </div>
            </div>
          </BambooReveal>
        </div>
      </section>

      <BambooEdge from="paper" to="pine" variant="c" />
    </>
  );
}
