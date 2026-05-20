import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { FadeIn, PageTransition, StaggerContainer, StaggerItem } from "~/components/page-animations";

const SILHOUETTES: Record<string, string> = {
  wrap: "M30 10 Q50 0 70 10 Q80 30 75 50 Q90 70 80 100 Q70 130 50 130 Q30 130 20 100 Q10 70 25 50 Q20 30 30 10 Z",
  dress: "M40 8 L60 8 L62 25 L75 50 L82 130 L18 130 L25 50 L38 25 Z",
  coat: "M35 8 L65 8 L80 28 L88 60 L84 130 L62 130 L60 75 L50 130 L40 75 L38 130 L16 130 L12 60 L20 28 Z",
  scarf: "M15 25 Q35 18 50 30 Q65 42 85 28 L88 35 Q70 55 50 45 Q30 35 18 50 Z M50 40 L42 130 L58 130 Z",
  default: "M35 8 L65 8 L80 28 L88 130 L12 130 L20 28 Z",
};

function getCategorySilhouette(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("wrap")) return SILHOUETTES.wrap!;
  if (lower.includes("dress") || lower.includes("skirt")) return SILHOUETTES.dress!;
  if (lower.includes("coat") || lower.includes("jacket")) return SILHOUETTES.coat!;
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
        className="border-b-2 border-foreground px-6 pt-16 pb-14 text-center"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn className="mx-auto" style={{ maxWidth: "1440px" }}>
          <p
            className="font-mono text-[10px] tracking-[0.28em] uppercase mb-4"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Browse
          </p>
          <h1
            className="font-serif italic leading-none tracking-tight"
            style={{
              fontSize: "clamp(3rem, 7vw, 5rem)",
              letterSpacing: "-0.025em",
            }}
          >
            The Collections.
          </h1>
          <p
            className="font-sans mt-5 mx-auto"
            style={{
              fontSize: "15px",
              lineHeight: 1.85,
              color: "var(--vn-steel-mist)",
              maxWidth: "48ch",
            }}
          >
            {list.length} {list.length === 1 ? "collection" : "collections"} — each one a distinct frequency.
          </p>
        </FadeIn>
      </section>

      {list.length === 0 ? (
        <FadeIn className="px-7 py-24 text-center" style={{ background: "var(--vn-paper)" }}>
          <p className="font-serif italic text-2xl" style={{ color: "var(--vn-steel-mist)" }}>
            No collections available at this time.
          </p>
          <Link href="/shop" className="vn-stamp vn-stamp-solid mt-8 inline-flex text-[10px]">
            Browse All Garments →
          </Link>
        </FadeIn>
      ) : (
        <section className="px-7 pb-16 pt-14" style={{ background: "var(--vn-bone)" }}>
          <div className="mx-auto max-w-7xl">
            {/* Section sub-header */}
            <FadeIn className="flex items-end justify-between mb-10 gap-6">
              <div>
                <p
                  className="font-mono text-[9.5px] tracking-[0.22em] uppercase mb-2"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  Browse by collection
                </p>
                <h2
                  className="font-serif italic leading-[1.05] tracking-tight"
                  style={{ fontSize: "clamp(2rem, 4vw, 3rem)", letterSpacing: "-0.02em" }}
                >
                  Choose your{" "}
                  <em style={{ color: "var(--vn-steel)" }}>frequency.</em>
                </h2>
              </div>
              <Link
                href="/shop"
                className="font-mono text-[10.5px] tracking-[0.22em] uppercase whitespace-nowrap transition-opacity hover:opacity-70 flex-shrink-0"
                style={{
                  borderBottom: "1px solid var(--vn-ink)",
                  paddingBottom: "4px",
                  color: "var(--vn-ink)",
                }}
              >
                View all garments →
              </Link>
            </FadeIn>

            {/* Collection cards */}
            <StaggerContainer
              className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              staggerDelay={0.05}
            >
              {list.map((collection, i) => {
                const count = collection._count.collectionProducts;
                return (
                  <StaggerItem key={collection.id}>
                    <Link
                      href={`/collections/${collection.slug}`}
                      className="vn-cat-card group flex flex-col border border-foreground overflow-hidden"
                      style={{ background: "var(--vn-paper)" }}
                    >
                      {/* Silhouette image panel */}
                      <div
                        className="relative border-b border-foreground overflow-hidden"
                        style={{
                          aspectRatio: "4/3",
                          background: `linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
                        }}
                      >
                        <svg
                          viewBox="0 0 100 140"
                          className="absolute inset-0 w-full h-full"
                          style={{ padding: "8%" }}
                          aria-hidden="true"
                        >
                          <path
                            d={getCategorySilhouette(collection.name)}
                            fill="var(--vn-bone)"
                            opacity="0.85"
                          />
                        </svg>
                        {/* Edition stamp */}
                        <div
                          className="absolute left-3 top-3 font-mono text-[9.5px] tracking-[0.18em] uppercase px-2 py-1"
                          style={{ background: "var(--vn-bone)", color: "var(--vn-ink)" }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        {/* Count stamp */}
                        <div
                          className="absolute right-3 top-3 font-mono text-[9.5px] tracking-[0.18em] uppercase px-2 py-1"
                          style={{ background: "var(--vn-ink)", color: "var(--vn-bone)" }}
                        >
                          {count} {count === 1 ? "piece" : "pieces"}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="vn-cat-meta flex items-end justify-between gap-3 px-4 py-4">
                        <div>
                          <span
                            className="vn-cat-name font-serif italic leading-[1.1] block"
                            style={{
                              fontSize: "clamp(1.2rem, 1.8vw, 1.5rem)",
                              letterSpacing: "-0.01em",
                              color: "var(--vn-ink)",
                            }}
                          >
                            {collection.name}
                          </span>
                          {collection.description && (
                            <span
                              className="font-sans text-[12px] leading-relaxed line-clamp-1 mt-0.5 block"
                              style={{ color: "var(--vn-steel-mist)" }}
                            >
                              {collection.description}
                            </span>
                          )}
                        </div>
                        <span
                          className="font-mono text-[9.5px] tracking-[0.18em] uppercase flex-shrink-0 transition-opacity group-hover:opacity-60"
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
