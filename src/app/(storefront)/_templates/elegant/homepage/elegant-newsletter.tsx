"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { useReducedMotion } from "~/hooks/use-reduced-motion";

import { resolveFields } from "..";

const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, visible };
}

export function ElegantNewsletter({
  customFields,
  sectionAttrs,
}: {
  customFields?: unknown;
  /** Spread on root <section> for preview overlay hotspot. */
  sectionAttrs?: Record<string, string>;
} = {}) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { ref, visible } = useReveal();
  const reducedMotion = useReducedMotion();

  const f = resolveFields(customFields, [
    "elegant.homepage.newsletter-label",
    "elegant.homepage.newsletter-heading",
    "elegant.homepage.newsletter-heading-accent",
    "elegant.homepage.newsletter-body",
    "elegant.homepage.newsletter-button",
  ]);
  const label = f["elegant.homepage.newsletter-label"] ?? "";
  const heading = f["elegant.homepage.newsletter-heading"] ?? "";
  const headingAccent = f["elegant.homepage.newsletter-heading-accent"] ?? "";
  const body = f["elegant.homepage.newsletter-body"] ?? "";
  const buttonText = f["elegant.homepage.newsletter-button"] ?? "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // NOTE: there is no newsletter/marketing-subscribe backend wired up yet
    // (no public tRPC procedure exists to persist this address anywhere).
    // Rather than fake a successful signup, tell the visitor honestly that
    // sign-ups aren't available yet instead of silently discarding their email.
    setSubmitted(true);
  };

  const revealStyle = (delay: number): React.CSSProperties =>
    reducedMotion
      ? {}
      : {
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: `opacity 0.9s ${easeOut} ${delay}s, transform 0.9s ${easeOut} ${delay}s`,
        };

  return (
    <section
      {...sectionAttrs}
      style={{
        padding: "80px 40px",
        background: "var(--el-ink, #1c1a17)",
        color: "var(--el-paper, #fbf8f2)",
      }}
    >
      <div
        ref={ref}
        style={{
          maxWidth: 920,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <div style={revealStyle(0)}>
          <span
            className="el-newsletter-eyebrow"
            {...fieldAttr("elegant.homepage.newsletter-label")}
          >
            {label}
          </span>
        </div>

        <div style={revealStyle(0.1)}>
          <h2
            style={{
              fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
              fontWeight: 400,
              fontSize: "clamp(36px, 4.5vw, 56px)",
              lineHeight: 1.05,
              letterSpacing: "-0.01em",
              margin: "0 0 16px",
              color: "var(--el-paper, #fbf8f2)",
            }}
          >
            <span {...fieldAttr("elegant.homepage.newsletter-heading")}>
              {heading}
            </span>
            {heading && headingAccent ? " " : ""}
            {headingAccent && (
              <em
                style={{ fontStyle: "italic" }}
                {...fieldAttr("elegant.homepage.newsletter-heading-accent")}
              >
                {headingAccent}
              </em>
            )}
          </h2>
        </div>

        {body && (
          <div style={revealStyle(0.2)}>
            <p
              style={{
                color: "rgba(255,255,255,0.65)",
                maxWidth: 480,
                margin: "0 auto 36px",
                lineHeight: 1.65,
                fontSize: 16,
                fontFamily: "var(--font-sans, sans-serif)",
              }}
              {...fieldAttr("elegant.homepage.newsletter-body")}
            >
              {body}
            </p>
          </div>
        )}

        <div style={revealStyle(0.3)}>
          {submitted ? (
            <p role="status" className="el-newsletter-success">
              Newsletter sign-ups aren&apos;t open yet — thanks for your
              interest, and please check back soon.
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{
                maxWidth: 480,
                margin: "0 auto",
                display: "flex",
                gap: 8,
                alignItems: "center",
                borderBottom: "1px solid rgba(255,255,255,0.3)",
                paddingBottom: 6,
              }}
            >
              <label htmlFor="el-newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="el-newsletter-email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="el-newsletter-input"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: 0,
                  color: "var(--el-paper, #fbf8f2)",
                  fontSize: 16,
                  padding: "12px 0",
                  fontFamily: "var(--font-sans, sans-serif)",
                }}
              />
              <button
                type="submit"
                className="el-newsletter-submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--el-paper, #fbf8f2)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans, sans-serif)",
                  flexShrink: 0,
                }}
              >
                <span {...fieldAttr("elegant.homepage.newsletter-button")}>
                  {buttonText}
                </span>
                <ArrowRight
                  aria-hidden={true}
                  style={{ width: 14, height: 14 }}
                />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
