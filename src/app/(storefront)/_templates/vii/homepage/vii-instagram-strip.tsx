import Image from "next/image";

type GalleryImage = {
  url: string;
  altText: string;
};

type Props = {
  handle: string;
  images: GalleryImage[];
  ctaText?: string;
};

export function ViiInstagramStrip({ handle, images, ctaText }: Props) {
  const displayed = images.slice(0, 5);

  if (displayed.length === 0 && !handle) {
    return null;
  }

  return (
    <section
      aria-label="Instagram gallery"
      style={{
        background: "var(--vii-cream)",
        padding: "clamp(48px, 6vw, 72px) clamp(24px, 6vw, 96px)",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Handle */}
        {handle && (
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--vii-ink-soft)",
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            {handle}
          </p>
        )}

        {/* Photo strip */}
        {displayed.length > 0 ? (
          <ul
            role="list"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${displayed.length}, 1fr)`,
              gap: "clamp(6px, 1vw, 14px)",
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
            className="vii-instagram-strip"
          >
            {displayed.map((img, i) => (
              <li key={i} style={{ aspectRatio: "1/1", position: "relative" }}>
                <Image
                  src={img.url}
                  alt={img.altText || ""}
                  fill
                  sizes={`${Math.floor(100 / displayed.length)}vw`}
                  style={{ objectFit: "cover" }}
                />
              </li>
            ))}
          </ul>
        ) : (
          // Placeholder row when handle is set but no images yet
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "clamp(6px, 1vw, 14px)",
            }}
            aria-hidden="true"
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1/1",
                  background: "var(--vii-tan)",
                  opacity: 0.35,
                }}
              />
            ))}
          </div>
        )}

        {/* Follow button */}
        {handle && (
          <div
            style={{ textAlign: "center", marginTop: "clamp(24px, 4vw, 40px)" }}
          >
            <a
              href={`https://instagram.com/${handle.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${ctaText ?? "Follow on Instagram"} (opens in new tab)`}
              style={{
                display: "inline-block",
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontWeight: 500,
                color: "var(--vii-navy)",
                textDecoration: "none",
                border: "1px solid var(--vii-copper)",
                borderRadius: "2rem",
                padding: "10px 28px",
                transition: "background 0.2s ease, color 0.2s ease",
              }}
              className="vii-ig-cta"
            >
              {ctaText ?? "Follow on Instagram"}
            </a>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 480px) {
          .vii-instagram-strip {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        .vii-ig-cta:hover,
        .vii-ig-cta:focus-visible {
          background: var(--vii-copper);
          color: var(--vii-paper);
          outline: none;
        }
        .vii-ig-cta:focus-visible {
          outline: 2px solid var(--vii-copper);
          outline-offset: 3px;
        }
      `}</style>
    </section>
  );
}
