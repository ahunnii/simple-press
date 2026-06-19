"use client";

import { useViiReveal } from "../hooks/use-vii-reveal";

type Props = {
  heading: string;
  headingAccent: string;
  body: string;
  googleUrl?: string;
  facebookUrl?: string;
};

function ReviewButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens in a new tab)`}
      className="inline-flex items-center gap-2 transition-opacity hover:opacity-85"
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: 12,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "var(--vii-navy)",
        background: "var(--vii-paper)",
        padding: "16px 28px",
        borderRadius: "var(--radius)",
        textDecoration: "none",
      }}
    >
      {label}
      <span aria-hidden="true">→</span>
    </a>
  );
}

export function ViiContactReview({
  heading,
  headingAccent,
  body,
  googleUrl,
  facebookUrl,
}: Props) {
  const { ref, visible } = useViiReveal(0.08);

  return (
    <section
      aria-labelledby="contact-review-heading"
      style={{
        background: "var(--vii-navy)",
        padding: "clamp(72px, 12vw, 140px) clamp(24px, 8vw, 120px)",
        textAlign: "center",
      }}
    >
      <div
        ref={ref}
        className={`vii-reveal${visible ? " is-visible" : ""}`}
        style={{ maxWidth: 680, margin: "0 auto" }}
      >
        <h2
          id="contact-review-heading"
          style={{
            fontFamily: "var(--font-serif)",
            fontWeight: 400,
            fontSize: "clamp(34px, 5vw, 60px)",
            lineHeight: 1.08,
            color: "var(--vii-paper)",
            margin: 0,
          }}
        >
          {heading}{" "}
          {headingAccent && (
            <em
              style={{ fontStyle: "italic", color: "var(--vii-copper-light)" }}
            >
              {headingAccent}
            </em>
          )}
        </h2>

        {body && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "clamp(14px, 1.3vw, 16px)",
              lineHeight: 1.8,
              color: "var(--vii-paper)",
              opacity: 0.85,
              margin: "28px auto 0",
              maxWidth: 520,
            }}
          >
            {body}
          </p>
        )}

        <div
          style={{
            marginTop: 40,
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "center",
          }}
        >
          {googleUrl && (
            <ReviewButton href={googleUrl} label="Review on Google" />
          )}
          {facebookUrl && (
            <ReviewButton href={facebookUrl} label="Review on Facebook" />
          )}
        </div>
      </div>
    </section>
  );
}
