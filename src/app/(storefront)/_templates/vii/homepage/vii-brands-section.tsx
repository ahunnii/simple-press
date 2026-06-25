"use client";

import { useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";

import type { TemplateListRow } from "~/lib/template-fields";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

import { useViiReveal } from "../hooks/use-vii-reveal";
import { ViiOverline } from "../shared/vii-overline";

type Props = {
  overline?: string;
  heading?: string;
  logos: TemplateListRow[];
  /** Optional: override the id used on the <h2> and aria-labelledby.
   *  Defaults to "vii-brands-heading". Pass a unique value when rendering
   *  a second instance (e.g. on the shop page) to avoid duplicate ids. */
  headingId?: string;
  /** When true, logos scroll in a continuous horizontal marquee instead of
   *  the default static wrapping row. The marquee path is client-side only
   *  (this file is already "use client"). Reduced-motion users see the
   *  static wrapping row instead — handled via useReducedMotion(). */
  marquee?: boolean;
};

// ── Single-logo renderer ─────────────────────────────────────────────────────
// Shared between the static and marquee render paths so the JSX lives in
// exactly one place.

type LogoItemProps = {
  logo: TemplateListRow;
  index: number;
  /** When true the item is in the aria-hidden duplicate track; links become
   *  non-focusable and images lose their alt text. */
  ariaHidden?: boolean;
};

function LogoItem({ logo, index, ariaHidden = false }: LogoItemProps) {
  const image = typeof logo.image === "string" ? logo.image : "";
  const name = typeof logo.name === "string" ? logo.name : "";
  const link =
    typeof logo.link === "string" && logo.link.trim() ? logo.link : "";
  if (!image) return null;

  const isExternal = /^https?:\/\//i.test(link);

  const img = (
    <span
      style={{
        position: "relative",
        display: "block",
        width: "clamp(110px, 16vw, 160px)",
        height: "clamp(56px, 8vw, 80px)",
      }}
    >
      <Image
        src={image}
        alt={ariaHidden ? "" : name || "Brand logo"}
        fill
        sizes="160px"
        style={{ objectFit: "contain" }}
      />
    </span>
  );

  return (
    <li key={logo._id ?? index}>
      {link ? (
        <a
          href={link}
          {...(isExternal
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          aria-label={ariaHidden ? undefined : name || "Brand"}
          aria-hidden={ariaHidden ? true : undefined}
          tabIndex={ariaHidden ? -1 : undefined}
          className="inline-block transition-opacity hover:opacity-70 focus-visible:opacity-70"
        >
          {img}
          {isExternal && !ariaHidden && (
            <span className="sr-only"> (opens in new tab)</span>
          )}
        </a>
      ) : (
        img
      )}
    </li>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function ViiBrandsSection({
  overline,
  heading,
  logos,
  headingId = "vii-brands-heading",
  marquee = false,
}: Props) {
  const { ref, visible } = useViiReveal(0.1);
  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);

  if (logos.length === 0) return null;

  const labelledBy = heading ? headingId : undefined;

  // Use marquee mode only when requested AND reduced motion is not active.
  // When reduced-motion is on we fall back to the static wrapping row, which
  // is the correct, animation-free layout — no need for the duplicate track.
  const useMarquee = marquee && !reducedMotion;

  const listStyle: React.CSSProperties = {
    listStyle: "none",
    margin: 0,
    padding: 0,
  };

  return (
    <section
      aria-labelledby={labelledBy}
      aria-label={heading ? undefined : "Brands we carry"}
      style={{
        background: "var(--vii-paper)",
        padding: "clamp(56px, 8vw, 96px) clamp(24px, 6vw, 96px)",
        borderTop: "1px solid var(--vii-hairline)",
      }}
    >
      <div style={{ maxWidth: useMarquee ? undefined : 1100, margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 12,
            marginBottom: "clamp(32px, 5vw, 56px)",
            ...(useMarquee
              ? { maxWidth: 1100, margin: "0 auto clamp(32px, 5vw, 56px)" }
              : {}),
          }}
        >
          {overline && (
            <ViiOverline tone="light" align="center">
              {overline}
            </ViiOverline>
          )}
          {heading && (
            <h2
              id={headingId}
              style={{
                fontFamily: "var(--font-serif)",
                fontWeight: 400,
                fontSize: "clamp(26px, 4vw, 48px)",
                lineHeight: 1.1,
                color: "var(--vii-navy)",
                margin: 0,
              }}
            >
              {heading}
            </h2>
          )}
        </div>

        {useMarquee ? (
          /* ── Marquee mode ──────────────────────────────────────────────── */
          <div style={{ position: "relative" }}>
            {/* Clip wrapper — hides the translate overflow */}
            <div style={{ overflow: "hidden", width: "100%" }}>
              {/* Spacing comes from `margin-right` on each <li> (see
                  .vii-marquee-track > li in globals.css), NOT flex `gap`, so the
                  duplicated set loops seamlessly under translateX(-50%). */}
              <ul
                className="vii-marquee-track"
                style={{
                  ...listStyle,
                  display: "flex",
                  alignItems: "center",
                }}
                data-paused={paused ? "true" : "false"}
              >
                {/* Primary (real) set */}
                {logos.map((logo, i) => (
                  <LogoItem key={`primary-${logo._id ?? i}`} logo={logo} index={i} />
                ))}
                {/* Duplicate set — aria-hidden so AT/keyboard only hit the real set */}
                {logos.map((logo, i) => (
                  <LogoItem
                    key={`dupe-${logo._id ?? i}`}
                    logo={logo}
                    index={i}
                    ariaHidden
                  />
                ))}
              </ul>
            </div>

            {/* Pause/Play toggle — WCAG 2.2.2 control for auto-moving content */}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play brand animation" : "Pause brand animation"}
              aria-pressed={paused}
              style={{
                position: "absolute",
                bottom: -36,
                right: 0,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background:
                  "color-mix(in srgb, var(--vii-navy) 10%, transparent)",
                border:
                  "1px solid color-mix(in srgb, var(--vii-navy) 20%, transparent)",
                color: "var(--vii-navy)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
            >
              {paused ? (
                <Play aria-hidden={true} style={{ width: 12, height: 12 }} />
              ) : (
                <Pause aria-hidden={true} style={{ width: 12, height: 12 }} />
              )}
            </button>
          </div>
        ) : (
          /* ── Static mode (default — unchanged behaviour) ───────────────── */
          <div ref={ref} className={`vii-reveal${visible ? " is-visible" : ""}`}>
            <ul
              style={{
                ...listStyle,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: "clamp(32px, 6vw, 72px)",
              }}
            >
              {logos.map((logo, i) => (
                <LogoItem key={logo._id ?? i} logo={logo} index={i} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
