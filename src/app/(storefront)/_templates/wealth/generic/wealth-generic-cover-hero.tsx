import Image from "next/image";

import { WealthReveal } from "../shared/wealth-reveal";

type Props = {
  image: string;
  title: string;
  excerpt?: string;
  kicker?: string;
};

/** Full cover-image hero for GenericPage records that have `page.image` set. */
export function WealthGenericCoverHero({ image, title, excerpt, kicker }: Props) {
  return (
    <div style={{ position: "relative", minHeight: "clamp(320px, 42vw, 480px)" }}>
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, color-mix(in srgb, var(--wealth-ink) 75%, transparent) 0%, color-mix(in srgb, var(--wealth-ink) 25%, transparent) 55%, transparent 100%)",
        }}
      />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end" }}>
        <WealthReveal className="w-full">
          <div
            className="mx-auto w-full text-center"
            style={{
              maxWidth: "var(--wealth-container)",
              padding: "var(--wealth-gutter)",
              paddingBottom: "calc(var(--wealth-rhythm) * 1.5)",
            }}
          >
            {/* Not the shared WealthEyebrow/WealthH1 — their color rules are
                deliberately unlayered so they beat Tailwind utilities
                regardless of specificity, which would swallow the
                paper-color override needed for legibility on a dark scrim. */}
            {kicker && (
              <p
                style={{
                  fontFamily: "var(--font-wealth-mono)",
                  fontSize: 13,
                  fontWeight: 400,
                  letterSpacing: "1.9px",
                  textTransform: "uppercase",
                  color: "var(--wealth-paper)",
                  marginBottom: 12,
                }}
              >
                {kicker}
              </p>
            )}
            <h1
              style={{
                fontFamily: "var(--font-wealth-display)",
                fontWeight: 500,
                fontSize: "clamp(32px, 4.5vw, 40px)",
                lineHeight: 1.3,
                letterSpacing: "0.4px",
                color: "var(--wealth-paper)",
                margin: 0,
              }}
            >
              {title}
            </h1>
            {excerpt && (
              <p
                style={{
                  fontFamily: "var(--font-wealth-body)",
                  fontSize: 17,
                  lineHeight: "25.5px",
                  color: "var(--wealth-paper)",
                  opacity: 0.9,
                  maxWidth: 620,
                  margin: "16px auto 0",
                }}
              >
                {excerpt}
              </p>
            )}
          </div>
        </WealthReveal>
      </div>
    </div>
  );
}
