import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { FadeIn, PageTransition, StaggerContainer, StaggerItem } from "~/components/page-animations";

/* Same silhouette helper as the shop page */
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
      {/* Editorial header */}
      <section
        className="border-b-2 border-foreground"
        style={{ background: "var(--vn-paper)" }}
      >
        <div className="flex items-stretch" style={{ minHeight: "140px" }}>
          <div
            className="hidden md:flex flex-col justify-center gap-2 px-7 py-8 border-r border-foreground/20"
            style={{ minWidth: "200px" }}
          >
            <span className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-muted-foreground">
              Section / 02
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-muted-foreground opacity-60">
              All collections
            </span>
          </div>
          <FadeIn className="flex-1 flex items-center px-7 py-8">
            <h1
              className="font-serif italic leading-none tracking-tight"
              style={{
                fontSize: "clamp(3rem, 7vw, 6rem)",
                letterSpacing: "-0.025em",
              }}
            >
              The <em style={{ color: "var(--vn-steel)" }}>Collections.</em>
            </h1>
          </FadeIn>
          <div
            className="hidden lg:flex flex-col justify-center gap-2 px-7 py-8 border-l border-foreground/20 text-right"
            style={{ minWidth: "160px" }}
          >
            <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-muted-foreground">
              Visual Noise
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.18em] uppercase text-muted-foreground">
              {list.length} {list.length === 1 ? "collection" : "collections"}
            </span>
          </div>
        </div>
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
        <section className="px-7 pb-14 pt-14" style={{ background: "var(--vn-paper)" }}>
          {/* Section heading */}
          <div className="flex items-end justify-between mb-10 gap-6 mx-auto max-w-7xl">
            <div>
              <p
                className="font-mono text-[9.5px] tracking-[0.18em] uppercase mb-2.5"
                style={{ color: "var(--vn-steel)" }}
              >
                Browse by collection
              </p>
              <h2
                className="font-serif italic leading-[1.05] tracking-tight"
                style={{
                  fontSize: "clamp(2rem, 4.4vw, 3.75rem)",
                  letterSpacing: "-0.02em",
                }}
              >
                Choose your{" "}
                <em style={{ color: "var(--vn-steel)" }}>frequency.</em>
              </h2>
            </div>
            <Link
              href="/shop"
              className="font-mono text-[10.5px] tracking-[0.22em] uppercase px-5 py-3.5 whitespace-nowrap transition-all hover:opacity-80 flex-shrink-0"
              style={{ border: "1px solid var(--vn-ink)", color: "var(--vn-ink)" }}
            >
              View all garments ↓
            </Link>
          </div>

          {/* Collection cards grid — same design as shop page category cards */}
          <StaggerContainer
            className="mx-auto max-w-7xl grid gap-3.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
            staggerDelay={0.05}
          >
            {list.map((collection, i) => {
              const count = collection._count.collectionProducts;
              return (
                <StaggerItem key={collection.id}>
                  <Link
                    href={`/collections/${collection.slug}`}
                    className="vn-cat-card flex flex-col border border-foreground overflow-hidden"
                    style={{ background: "var(--vn-paper)" }}
                  >
                    {/* Silhouette panel */}
                    <div
                      className="aspect-[4/5] relative border-b border-foreground overflow-hidden"
                      style={{
                        background: `linear-gradient(180deg, var(--vn-steel-deep), var(--vn-steel))`,
                      }}
                    >
                      <svg
                        viewBox="0 0 100 140"
                        className="absolute inset-0 w-full h-full"
                        style={{ padding: "10%" }}
                        aria-hidden="true"
                      >
                        <path
                          d={getCategorySilhouette(collection.name)}
                          fill="var(--vn-bone)"
                          opacity="0.9"
                        />
                      </svg>
                    </div>

                    {/* Meta */}
                    <div className="vn-cat-meta flex flex-col gap-1 px-3.5 py-3.5">
                      <span
                        className="vn-cat-num font-mono text-[10px] tracking-[0.22em] uppercase"
                        style={{ color: "var(--vn-steel)" }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className="vn-cat-name font-serif italic leading-[1.15]"
                        style={{
                          fontSize: "clamp(1.1rem, 1.6vw, 1.6rem)",
                          letterSpacing: "-0.01em",
                          color: "var(--vn-ink)",
                        }}
                      >
                        {collection.name}
                      </span>
                      <span
                        className="vn-cat-count font-mono text-[10px] tracking-[0.18em] uppercase"
                        style={{ color: "var(--vn-ink-soft)" }}
                      >
                        {count} {count === 1 ? "piece" : "pieces"}
                      </span>
                    </div>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </section>
      )}
    </PageTransition>
  );
}
