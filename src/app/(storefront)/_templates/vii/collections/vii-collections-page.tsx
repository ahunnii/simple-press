import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";

import { ViiOverline } from "../shared/vii-overline";
import { ViiReveal, ViiRevealGroup } from "../shared/vii-reveal";

export function ViiCollectionsPage({
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];

  return (
    <div>
      {/* Editorial hero */}
      <section
        aria-labelledby="vii-collections-heading"
        style={{
          background: "var(--vii-cream)",
          // Clear the fixed header (≈106px) plus generous editorial breathing room.
          padding:
            "calc(var(--vii-header-offset) + clamp(40px, 6vw, 72px)) clamp(24px, 6vw, 96px) clamp(40px, 5vw, 64px)",
        }}
      >
        <ViiReveal
          style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}
        >
          <ViiOverline align="center" style={{ marginBottom: 14 }}>
            Shop by collection
          </ViiOverline>
          <h1
            id="vii-collections-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              lineHeight: 1.05,
              color: "var(--vii-navy)",
              margin: 0,
            }}
          >
            Our{" "}
            <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
              collections
            </em>
          </h1>
          {list.length > 0 && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 1.4vw, 17px)",
                color: "var(--vii-ink-soft)",
                margin: "18px 0 0",
              }}
            >
              {list.length} collection{list.length !== 1 ? "s" : ""}
            </p>
          )}
        </ViiReveal>
      </section>

      {/* Grid */}
      <section
        aria-label="Collections"
        style={{
          background: "var(--vii-paper)",
          padding:
            "clamp(40px, 6vw, 72px) clamp(24px, 6vw, 96px) clamp(64px, 9vw, 112px)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {list.length === 0 ? (
            <div
              style={{
                padding: "clamp(48px, 8vw, 96px) 0",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 16,
                  color: "var(--vii-ink-soft)",
                }}
              >
                No collections available at this time.
              </p>
            </div>
          ) : (
            <ViiRevealGroup
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "clamp(24px, 3.5vw, 44px)",
              }}
            >
              {list.map((collection, i) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="group vii-reveal-item"
                  style={
                    {
                      "--i": Math.min(i, 7),
                      display: "block",
                      textDecoration: "none",
                    } as React.CSSProperties
                  }
                >
                  <div
                    style={{
                      position: "relative",
                      aspectRatio: "3 / 4",
                      overflow: "hidden",
                      borderRadius: "var(--radius)",
                      background: "var(--vii-cream)",
                      marginBottom: 16,
                    }}
                  >
                    <Image
                      src={collection.imageUrl ?? "/placeholder.svg"}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <h2
                      className="transition-opacity group-hover:opacity-70"
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontWeight: 500,
                        fontSize: 20,
                        color: "var(--vii-navy)",
                        margin: 0,
                      }}
                    >
                      {collection.name}
                    </h2>
                    {collection.description && (
                      <p
                        className="line-clamp-2"
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: "var(--vii-ink-soft)",
                          margin: 0,
                        }}
                      >
                        {collection.description}
                      </p>
                    )}
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: 13,
                        color: "var(--vii-ink-soft)",
                        margin: 0,
                      }}
                    >
                      {collection._count.collectionProducts} product
                      {collection._count.collectionProducts !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </ViiRevealGroup>
          )}
        </div>
      </section>
    </div>
  );
}
