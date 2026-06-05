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

export function SledgeCollectionsPage({
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];

  return (
    <PageTransition className="bg-white">
      <section className="mx-auto w-full max-w-7xl px-6 pt-14 pb-10 md:pb-12">
        <FadeIn className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-left">
            <h1
              className="font-heading leading-none font-semibold tracking-tight"
              style={{
                fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
                letterSpacing: "-0.025em",
                color: "var(--sl-orange)",
              }}
            >
              All Collections
            </h1>
            <p
              className="mt-4 max-w-xl font-sans text-sm leading-relaxed md:text-base"
              style={{ color: "var(--sl-ink-soft)" }}
            >
              Browse curated groupings of one-of-a-kind pieces from the studio.
            </p>
          </div>
          <Link
            href="/shop"
            className="flex shrink-0 items-center gap-2 self-start px-4 py-2 font-sans text-xs tracking-[.2em] uppercase transition-opacity hover:opacity-60 sm:self-auto"
            style={{
              border: "1px solid var(--sl-ink)",
              color: "var(--sl-ink)",
            }}
          >
            View All Products →
          </Link>
        </FadeIn>
      </section>

      {list.length === 0 ? (
        <FadeIn className="px-7 py-24 text-center">
          <p
            className="font-sans text-base"
            style={{ color: "var(--sl-ink-soft)" }}
          >
            No collections available at this time.
          </p>
        </FadeIn>
      ) : (
        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-7">
          <StaggerContainer
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            staggerDelay={0.05}
          >
            {list.map((collection) => {
              const count = collection._count.collectionProducts;
              return (
                <StaggerItem key={collection.id}>
                  <Link
                    href={`/collections/${collection.slug}`}
                    className="group flex flex-col overflow-hidden rounded-sm bg-white transition-shadow hover:shadow-md"
                    style={{
                      border: "1px solid #e8e8e8",
                      boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
                    }}
                  >
                    <div
                      className="relative overflow-hidden"
                      style={{
                        aspectRatio: "4/3",
                        background: "var(--sl-green)",
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
                          fill="var(--sl-cream)"
                          opacity="0.9"
                        />
                      </svg>

                      <div
                        className="absolute top-3 right-3 rounded-sm px-2 py-1 font-sans text-[10px] tracking-[0.14em] uppercase"
                        style={{
                          background: "var(--sl-coral)",
                          color: "#ffffff",
                        }}
                      >
                        {count} {count === 1 ? "item" : "items"}
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-3 px-4 py-4">
                      <div className="min-w-0">
                        <span
                          className="block font-sans text-base leading-tight tracking-[0.04em] uppercase transition-opacity group-hover:opacity-70 md:text-lg"
                          style={{ color: "var(--sl-ink)" }}
                        >
                          {collection.name}
                        </span>
                        {collection.description && (
                          <span
                            className="mt-1 line-clamp-2 block font-sans text-xs leading-relaxed"
                            style={{ color: "var(--sl-ink-soft)" }}
                          >
                            {collection.description}
                          </span>
                        )}
                      </div>
                      <span
                        className="flex-shrink-0 font-sans text-xs tracking-[0.14em] uppercase transition-opacity group-hover:opacity-60"
                        style={{ color: "var(--sl-coral)" }}
                      >
                        View →
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
