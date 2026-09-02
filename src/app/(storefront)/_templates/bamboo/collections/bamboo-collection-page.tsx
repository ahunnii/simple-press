import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionPageTemplateProps } from "../../types";
import type { Product } from "~/types";
import { cn } from "~/lib/utils";

import { BambooEdge } from "../shared/bamboo-edge";
import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooProductCard } from "../shared/bamboo-product-card";
import { BambooReveal, BambooRevealGroup } from "../shared/bamboo-reveal";
import {
  BAMBOO_BLOB_PERSONALITIES,
  BambooCollectionArt,
} from "./bamboo-collection-art";

/**
 * A single collection: sage hero carrying the collection's own name and
 * description (DB-driven — this slot has no template fields), a torn edge into
 * a paper band of product cards, then the cross-sell strip that keeps the page
 * from being a dead end.
 *
 * The product grid renders `BambooProductCard` unchanged — that component is
 * owned by the shared-component wave; this page only supplies its documented
 * `{ product, index }` props.
 */
export function BambooCollectionPage({
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
    <div className="bg-[var(--bamboo-paper)]">
      <section
        aria-labelledby="bamboo-collection-title"
        className="relative flex min-h-[min(38vh,400px)] items-center overflow-hidden bg-[var(--bamboo-sage)] px-6 pt-[118px] pb-[84px]"
        style={{ marginTop: "calc(var(--bamboo-header-offset) * -1)" }}
      >
        {/* Inner-page ambient budget: one culm edge anchor + two leaves. */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <span className="hidden sm:block">
            <span
              className="bamboo-el bamboo-el--b"
              style={
                {
                  "--w": "148px",
                  "--l": "-3.4%",
                  "--b": "-118px",
                  "--d": "0.26s",
                } as CSSProperties
              }
            >
              <span
                className="bamboo-sway"
                style={
                  {
                    "--dur": "9.4s",
                    "--dl": "-3.1s",
                    "--a1": "-0.5deg",
                    "--a2": "0.55deg",
                  } as CSSProperties
                }
              >
                <BambooGlyph id="s-culm-run" />
              </span>
            </span>
          </span>

          <span
            className="bamboo-drift"
            style={
              {
                "--l": "48%",
                "--t": "6%",
                "--w": "27px",
                "--dur": "17s",
                "--dl": "-5s",
                "--dx": "92px",
                "--dy": "340px",
                "--dr": "160deg",
              } as CSSProperties
            }
          >
            <BambooGlyph id="s-leaf-l" />
          </span>
          <span className="hidden sm:block">
            <span
              className="bamboo-drift"
              style={
                {
                  "--l": "68%",
                  "--t": "3%",
                  "--w": "23px",
                  "--dur": "21s",
                  "--dl": "-13s",
                  "--dx": "-64px",
                  "--dy": "370px",
                  "--dr": "-140deg",
                } as CSSProperties
              }
            >
              <BambooGlyph id="s-leaf" />
            </span>
          </span>
        </div>

        <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          <div>
            <Link
              href="/collections"
              className="bamboo-swipe inline-block text-[0.95rem] text-[var(--bamboo-pine)]"
            >
              <span aria-hidden="true">← </span>All Collections
            </Link>
            <h1
              id="bamboo-collection-title"
              className="font-heading mt-4 text-[clamp(2.3rem,4.4vw,3.5rem)] leading-[1.08] font-bold tracking-[-0.026em] text-[var(--bamboo-pine)]"
            >
              {collection.name}
            </h1>
            {collection.description ? (
              <p className="mt-[18px] max-w-[38ch] text-[1.08rem] leading-[1.6] text-[var(--bamboo-ink)]">
                {collection.description}
              </p>
            ) : null}
            <p className="mt-4 text-[0.86rem] font-medium tracking-[0.09em] text-[var(--bamboo-ink-soft)] uppercase">
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          </div>

          {collection.imageUrl ? (
            // Plain wrapper carries the responsive display utility: the
            // unlayered `.bamboo-photo-card` rule sets `display: block` and
            // would defeat a Tailwind `hidden` placed on the figure itself.
            <div className="hidden lg:block">
              <figure className="bamboo-photo-card rotate-[-2.5deg]">
                <Image
                  src={collection.imageUrl}
                  alt=""
                  width={1200}
                  height={1011}
                  sizes="340px"
                  priority
                />
                <span className="bamboo-photo-badge" aria-hidden="true">
                  <BambooGlyph id="s-wreath" className="block h-auto w-full" />
                </span>
              </figure>
            </div>
          ) : null}
        </div>
      </section>

      <BambooEdge
        from="sage"
        to="paper"
        variant="a"
        leaves={[
          { id: "s-leaf-d", l: "18%", t: "8%", w: "27px", r: "-21deg" },
          { id: "s-leaf", l: "58%", t: "30%", w: "22px", r: "15deg" },
        ]}
      />

      <section
        aria-labelledby="bamboo-collection-products-title"
        className="mx-auto max-w-[1200px] px-6 pt-[clamp(30px,3.4vw,52px)] pb-[clamp(58px,6vw,96px)]"
      >
        <h2 id="bamboo-collection-products-title" className="sr-only">
          Products in this collection
        </h2>

        {products.length === 0 ? (
          <BambooReveal>
            <div className="bamboo-torn-card mx-auto flex max-w-[560px] flex-col items-center gap-4 px-8 py-14 text-center">
              <BambooGlyph id="s-sprig" className="h-auto w-[104px]" />
              <p className="text-[1.05rem] text-[var(--bamboo-ink-soft)]">
                No products in this collection yet.
              </p>
              <Link href="/shop" className="bamboo-btn bamboo-btn-primary">
                Browse all products
              </Link>
            </div>
          </BambooReveal>
        ) : (
          <BambooRevealGroup className="grid grid-cols-1 items-stretch gap-[22px] sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
            {products.map((product, index) => (
              <div
                key={product.id}
                className="bamboo-reveal-item"
                style={{ "--i": index } as CSSProperties}
              >
                <BambooProductCard
                  index={index}
                  product={{ ...product } as Product}
                />
              </div>
            ))}
          </BambooRevealGroup>
        )}
      </section>

      {others.length > 0 ? (
        <>
          <BambooEdge from="paper" to="sage" variant="b" />

          <section
            aria-labelledby="bamboo-more-collections-title"
            className="bg-[var(--bamboo-sage)] px-6 pt-[clamp(40px,4.6vw,72px)] pb-[clamp(48px,5.4vw,84px)]"
          >
            <div className="mx-auto max-w-[1200px]">
              <BambooReveal>
                <h2
                  id="bamboo-more-collections-title"
                  className="font-heading text-[clamp(1.7rem,2.8vw,2.4rem)] leading-[1.1] font-bold tracking-[-0.018em] text-[var(--bamboo-pine)]"
                >
                  More Collections
                </h2>
              </BambooReveal>

              <BambooRevealGroup className="mt-8 grid grid-cols-1 items-stretch gap-[22px] sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
                {others.map((col, index) => {
                  const count = col._count.collectionProducts;
                  const blob = BAMBOO_BLOB_PERSONALITIES[
                    (index + 2) % BAMBOO_BLOB_PERSONALITIES.length
                  ] ?? { "--bc": "var(--bamboo-sage)" };

                  return (
                    // Reveal class on a wrapper — see the note in
                    // bamboo-collections-page.tsx: sharing an element with
                    // `.bamboo-card` would out-specify its hover tilt.
                    <div
                      key={col.id}
                      className="bamboo-reveal-item"
                      style={{ "--i": index } as CSSProperties}
                    >
                      <article className="bamboo-card group flex h-full flex-col">
                        <div className="bamboo-card-art">
                          <span
                            className="bamboo-blob"
                            style={blob as CSSProperties}
                          />
                          {col.imageUrl ? (
                            <span
                              className="bamboo-card-photo"
                              style={{ "--aw": "78%" } as CSSProperties}
                            >
                              <Image
                                className="bamboo-card-photo-img"
                                src={col.imageUrl}
                                alt=""
                                width={1200}
                                height={1011}
                                sizes="(max-width: 620px) 88vw, (max-width: 1080px) 44vw, 30vw"
                              />
                            </span>
                          ) : (
                            <BambooCollectionArt index={index + 2} />
                          )}
                          <span className="bamboo-sprout" aria-hidden="true">
                            <BambooGlyph
                              id="s-sprig"
                              className="block h-auto w-full"
                            />
                          </span>
                        </div>

                        <h3 className="font-heading mt-5 text-[1.22rem] leading-[1.2] font-semibold tracking-[-0.01em] text-[var(--bamboo-pine)]">
                          <Link
                            href={`/collections/${col.slug}`}
                            className="bamboo-card-link"
                          >
                            {col.name}
                          </Link>
                        </h3>

                        <div className="bamboo-card-foot mt-2">
                          <span className="text-[0.82rem] font-medium whitespace-nowrap text-[var(--bamboo-pine)]">
                            {count} {count === 1 ? "product" : "products"}
                          </span>
                          <span
                            aria-hidden="true"
                            className={cn(
                              "relative text-[0.95rem] font-medium text-[var(--bamboo-pine)]",
                              "after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:rounded-[2px] after:bg-[var(--bamboo-terracotta)] after:transition-[width] after:duration-300",
                              "group-focus-within:after:w-full group-hover:after:w-full",
                            )}
                          >
                            Shop now →
                          </span>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </BambooRevealGroup>
            </div>
          </section>

          <BambooEdge from="sage" to="pine" variant="c" />
        </>
      ) : (
        <BambooEdge from="paper" to="pine" variant="c" />
      )}
    </div>
  );
}
