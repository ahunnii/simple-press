import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { Product } from "~/types";

import { ViiProductCard } from "../shared/vii-product-card";

export function ViiCollectionPage({
  collection,
  additionalCollections,
}: DefaultCollectionPageTemplateProps) {
  const products = collection.collectionProducts
    .map((cp) => cp.product)
    .filter((p): p is NonNullable<typeof p> => p != null);

  const others = (additionalCollections ?? [])
    .filter((c) => c.slug !== collection.slug)
    .slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section
        aria-labelledby="vii-collection-heading"
        style={{
          background: "var(--vii-cream)",
          // Clear the fixed header (≈106px) plus generous editorial breathing room.
          padding:
            "calc(var(--vii-header-offset) + clamp(40px, 6vw, 72px)) clamp(24px, 6vw, 96px) clamp(32px, 4vw, 56px)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <nav
            aria-label="Breadcrumb"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 20,
              fontFamily: "var(--font-sans)",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--vii-ink-soft)",
            }}
          >
            <Link
              href="/"
              style={{
                color: "inherit",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                paddingBlock: 8,
                marginBlock: -8,
              }}
            >
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href="/collections"
              style={{
                color: "inherit",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                paddingBlock: 8,
                marginBlock: -8,
              }}
            >
              Collections
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" style={{ color: "var(--vii-navy)" }}>
              {collection.name}
            </span>
          </nav>

          <h1
            id="vii-collection-heading"
            style={{
              fontFamily: "var(--font-serif)",
              fontWeight: 400,
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              lineHeight: 1.05,
              color: "var(--vii-navy)",
              margin: 0,
            }}
          >
            {collection.name}
          </h1>
          {collection.description && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "clamp(15px, 1.4vw, 17px)",
                lineHeight: 1.7,
                color: "var(--vii-ink-soft)",
                maxWidth: 600,
                margin: "18px 0 0",
              }}
            >
              {collection.description}
            </p>
          )}
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--vii-ink-soft)",
              margin: "20px 0 0",
            }}
          >
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>

          {/* Banner image */}
          {collection.imageUrl && (
            <div
              className="vii-collection-banner"
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: "var(--radius)",
                background: "var(--vii-paper)",
                marginTop: "clamp(28px, 4vw, 44px)",
              }}
            >
              <Image
                src={collection.imageUrl}
                alt=""
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>
          )}
        </div>
      </section>

      {/* Products */}
      <section
        aria-labelledby="vii-collection-products-heading"
        style={{
          background: "var(--vii-paper)",
          padding:
            "clamp(40px, 6vw, 72px) clamp(24px, 6vw, 96px) clamp(64px, 9vw, 112px)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <h2 id="vii-collection-products-heading" className="sr-only">
            {collection.name} products
          </h2>
          {products.length === 0 ? (
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
                  margin: 0,
                }}
              >
                No products in this collection yet.
              </p>
              <Link
                href="/shop"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 24,
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  color: "var(--vii-navy)",
                  textDecoration: "none",
                  borderBottom: "1px solid var(--vii-copper)",
                  paddingBottom: 4,
                }}
              >
                View all products <span aria-hidden="true">→</span>
              </Link>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "clamp(20px, 3vw, 36px)",
              }}
            >
              {collection.collectionProducts.map((cp, index) => {
                const product = cp.product;
                if (!product) return null;
                return (
                  <ViiProductCard
                    key={cp.id}
                    product={product as unknown as Product}
                    index={index}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* More collections */}
      {others.length > 0 && (
        <section
          aria-labelledby="vii-more-collections-heading"
          style={{
            background: "var(--vii-cream)",
            padding: "clamp(56px, 8vw, 96px) clamp(24px, 6vw, 96px)",
          }}
        >
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: "clamp(28px, 4vw, 44px)",
              }}
            >
              <h2
                id="vii-more-collections-heading"
                style={{
                  fontFamily: "var(--font-serif)",
                  fontWeight: 400,
                  fontSize: "clamp(24px, 3.2vw, 36px)",
                  lineHeight: 1.1,
                  color: "var(--vii-navy)",
                  margin: 0,
                }}
              >
                More{" "}
                <em style={{ fontStyle: "italic", color: "var(--vii-copper)" }}>
                  collections
                </em>
              </h2>
              <Link
                href="/collections"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  flexShrink: 0,
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  color: "var(--vii-navy)",
                  textDecoration: "none",
                  borderBottom: "1px solid var(--vii-copper)",
                  paddingBottom: 4,
                }}
              >
                All collections <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "clamp(20px, 3vw, 36px)",
              }}
            >
              {others.map((col) => (
                <Link
                  key={col.id}
                  href={`/collections/${col.slug}`}
                  className="group"
                  style={{ display: "block", textDecoration: "none" }}
                >
                  <div
                    style={{
                      position: "relative",
                      aspectRatio: "4 / 3",
                      overflow: "hidden",
                      borderRadius: "var(--radius)",
                      background: "var(--vii-paper)",
                      marginBottom: 14,
                    }}
                  >
                    <Image
                      src={col.imageUrl ?? "/placeholder.svg"}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                  <h3
                    className="transition-opacity group-hover:opacity-70"
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontWeight: 500,
                      fontSize: 18,
                      color: "var(--vii-navy)",
                      margin: 0,
                    }}
                  >
                    {col.name}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      color: "var(--vii-ink-soft)",
                      margin: "4px 0 0",
                    }}
                  >
                    {col._count.collectionProducts} product
                    {col._count.collectionProducts !== 1 ? "s" : ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
