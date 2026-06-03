import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import {
  FadeIn,
  PageTransition,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

const SILHOUETTES: Record<string, string> = {
  wrap: "M30 10 Q50 0 70 10 Q80 30 75 50 Q90 70 80 100 Q70 130 50 130 Q30 130 20 100 Q10 70 25 50 Q20 30 30 10 Z",
  dress: "M40 8 L60 8 L62 25 L75 50 L82 130 L18 130 L25 50 L38 25 Z",
  coat: "M35 8 L65 8 L80 28 L88 60 L84 130 L62 130 L60 75 L50 130 L40 75 L38 130 L16 130 L12 60 L20 28 Z",
  scarf:
    "M15 25 Q35 18 50 30 Q65 42 85 28 L88 35 Q70 55 50 45 Q30 35 18 50 Z M50 40 L42 130 L58 130 Z",
  default: "M35 8 L65 8 L80 28 L88 130 L12 130 L20 28 Z",
};

function getCategorySilhouette(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("wrap")) return SILHOUETTES.wrap!;
  if (lower.includes("dress") || lower.includes("skirt"))
    return SILHOUETTES.dress!;
  if (lower.includes("coat") || lower.includes("jacket"))
    return SILHOUETTES.coat!;
  if (lower.includes("scarf")) return SILHOUETTES.scarf!;
  return SILHOUETTES.default!;
}

export function NoiseCollectionsPage({
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];

  return (
    <PageTransition>
      {/* ── Centered header ── */}
      <section
        className="px-6 pt-16 pb-14 text-center"
        style={{
          background: "var(--vn-paper)",
          borderBottom: "1px solid var(--vn-line-soft) ",
        }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "1440px" }}>
          <p
            className="mb-4 font-mono text-[10px] tracking-[0.28em] uppercase"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Browse
          </p>
          <h1
            className="font-serif leading-none tracking-tight italic"
            style={{
              fontSize: "clamp(3rem, 7vw, 5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            All Collections
          </h1>
          <Link
            href="/shop"
            className="mt-5 inline-flex flex-shrink-0 font-mono text-[10.5px] tracking-[0.22em] whitespace-nowrap uppercase transition-opacity hover:opacity-70"
            style={{
              borderBottom: "1px solid var(--vn-ink)",
              paddingBottom: "4px",
              color: "var(--vn-ink)",
            }}
          >
            View all products →
          </Link>
        </FadeIn>
      </section>

      {list.length === 0 ? (
        <FadeIn
          className="px-7 py-24 text-center"
          style={{ background: "var(--vn-paper)" }}
        >
          <p
            className="font-serif text-2xl italic"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            No collections available at this time.
          </p>
        </FadeIn>
      ) : (
        <section className="px-7 pt-14 pb-16">
          <div className="mx-auto max-w-7xl">
            {/* Collection cards */}
            <StaggerContainer
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              staggerDelay={0.05}
            >
              {list.map((collection, i) => {
                const count = collection._count.collectionProducts;
                return (
                  <StaggerItem key={collection.id}>
                    <Link
                      href={`/collections/${collection.slug}`}
                      className="vn-cat-card group border-foreground flex flex-col overflow-hidden border"
                      style={{ background: "var(--vn-paper)" }}
                    >
                      {/* Silhouette image panel */}
                      <div
                        className="border-foreground relative overflow-hidden border-b"
                        style={{
                          aspectRatio: "4/3",
                          background: `linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
                        }}
                      >
                        <svg
                          viewBox="0 0 100 140"
                          className="absolute inset-0 h-full w-full"
                          style={{ padding: "8%" }}
                          aria-hidden="true"
                        >
                          <path
                            d={getCategorySilhouette(collection.name)}
                            fill="var(--vn-bone)"
                            opacity="0.85"
                          />
                        </svg>

                        {/* Count stamp */}
                        <div
                          className="absolute top-3 right-3 px-2 py-1 font-mono text-[9.5px] tracking-[0.18em] uppercase"
                          style={{
                            background: "var(--vn-ink)",
                            color: "var(--vn-bone)",
                          }}
                        >
                          {count} {count === 1 ? "item" : "items"}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="vn-cat-meta flex items-end justify-between gap-3 px-4 py-4">
                        <div>
                          <span
                            className="vn-cat-name block font-serif leading-[1.1] text-(--vn-ink) italic transition-colors duration-200 group-hover:text-(--vn-bone)"
                            style={{
                              fontSize: "clamp(1.2rem, 1.8vw, 1.5rem)",
                              letterSpacing: "-0.01em",
                              // color: "var(--vn-ink)",
                            }}
                          >
                            {collection.name}
                          </span>
                          {collection.description && (
                            <span
                              className="mt-0.5 line-clamp-1 block font-sans text-[12px] leading-relaxed"
                              style={{ color: "var(--vn-steel-mist)" }}
                            >
                              {collection.description}
                            </span>
                          )}
                        </div>
                        <span
                          className="flex-shrink-0 font-mono text-[9.5px] tracking-[0.18em] uppercase transition-opacity group-hover:opacity-60"
                          style={{ color: "var(--vn-steel-mist)" }}
                        >
                          View →
                        </span>
                      </div>
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>
      )}
    </PageTransition>
  );
}
