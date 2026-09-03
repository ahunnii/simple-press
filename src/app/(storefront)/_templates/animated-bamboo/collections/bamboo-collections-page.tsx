import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultCollectionsPageTemplateProps } from "../../types";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { resolveFields } from "../index";
import { BambooEdge } from "../shared/bamboo-edge";
import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooReveal, BambooRevealGroup } from "../shared/bamboo-reveal";
import {
  BAMBOO_BLOB_PERSONALITIES,
  BambooCollectionArt,
} from "./bamboo-collection-art";

/**
 * Collections index — short sage hero (the two `collections.listing` fields)
 * torn into a paper band of card-system collection tiles.
 *
 * Inner-page ambient budget (design.md > Motion): ONE culm edge anchor plus
 * two drifting leaves, nothing else. The culm is the crownless `s-culm-run`
 * rooted off the left edge so the band only ever crops it mid-stalk, never
 * mid-plant.
 */
export function BambooCollectionsPage({
  business,
  collections,
}: DefaultCollectionsPageTemplateProps) {
  const list = collections ?? [];
  const f = resolveFields(business.siteContent?.customFields, [
    "animated-bamboo.collections.listing-title",
    "animated-bamboo.collections.listing-intro",
  ]);

  return (
    // flex column + flex-1 so this root grows to fill <main> (a column flex
    // container) and the trailing pine BambooEdge's mt-auto can pin to the
    // bottom instead of leaving a strip of paper above the footer.
    <div className="flex flex-1 flex-col bg-[var(--bamboo-paper)]">
      <section
        {...sectionGroupAttr("collections", "listing")}
        aria-labelledby="bamboo-collections-title"
        className="relative flex min-h-[min(38vh,400px)] items-center overflow-hidden bg-[var(--bamboo-sage)] px-6 pt-[118px] pb-[84px]"
        style={{ marginTop: "calc(var(--bamboo-header-offset) * -1)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          {/* Edge anchor — hidden below 640px so the copy keeps its measure. */}
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
                    "--dur": "8.8s",
                    "--dl": "-2.4s",
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
                "--l": "52%",
                "--t": "5%",
                "--w": "29px",
                "--dur": "16s",
                "--dl": "-3s",
                "--dx": "104px",
                "--dy": "330px",
                "--dr": "170deg",
              } as CSSProperties
            }
          >
            <BambooGlyph id="s-leaf" />
          </span>
          <span className="hidden sm:block">
            <span
              className="bamboo-drift"
              style={
                {
                  "--l": "74%",
                  "--t": "2%",
                  "--w": "24px",
                  "--dur": "20s",
                  "--dl": "-11s",
                  "--dx": "-72px",
                  "--dy": "360px",
                  "--dr": "-150deg",
                } as CSSProperties
              }
            >
              <BambooGlyph id="s-leaf-d" />
            </span>
          </span>
        </div>

        <div className="relative mx-auto w-full max-w-[1200px]">
          <h1
            id="bamboo-collections-title"
            className="font-heading text-[clamp(2.3rem,4.4vw,3.5rem)] leading-[1.08] font-bold tracking-[-0.026em] text-[var(--bamboo-pine)]"
            {...fieldAttr("animated-bamboo.collections.listing-title")}
          >
            {f["animated-bamboo.collections.listing-title"] ?? ""}
          </h1>
          <p
            className="mt-[18px] max-w-[38ch] text-[1.08rem] leading-[1.6] text-[var(--bamboo-ink)]"
            {...fieldAttr("animated-bamboo.collections.listing-intro")}
          >
            {f["animated-bamboo.collections.listing-intro"] ?? ""}
          </p>
        </div>
      </section>

      <BambooEdge
        from="sage"
        to="paper"
        variant="a"
        leaves={[
          { id: "s-leaf-d", l: "14%", t: "6%", w: "28px", r: "-24deg" },
          { id: "s-leaf", l: "46%", t: "34%", w: "22px", r: "18deg" },
          { id: "s-leaf-l", l: "73%", t: "2%", w: "25px", r: "-9deg" },
        ]}
      />

      <section
        aria-labelledby="bamboo-collections-grid-title"
        className="mx-auto max-w-[1200px] px-6 pt-[clamp(30px,3.4vw,52px)] pb-[clamp(58px,6vw,96px)]"
      >
        <h2 id="bamboo-collections-grid-title" className="sr-only">
          All collections
        </h2>

        {list.length === 0 ? (
          <BambooReveal>
            <div className="bamboo-torn-card mx-auto flex max-w-[560px] flex-col items-center gap-4 px-8 py-14 text-center">
              <BambooGlyph id="s-sprig" className="h-auto w-[104px]" />
              <p className="text-[1.05rem] text-[var(--bamboo-ink-soft)]">
                No collections available at this time.
              </p>
              <Link href="/shop" className="bamboo-btn bamboo-btn-primary">
                Browse all products
              </Link>
            </div>
          </BambooReveal>
        ) : (
          <BambooRevealGroup className="grid grid-cols-1 items-stretch gap-[22px] sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
            {list.map((collection, index) => {
              const count = collection._count.collectionProducts;
              const blob = BAMBOO_BLOB_PERSONALITIES[
                index % BAMBOO_BLOB_PERSONALITIES.length
              ] ?? { "--bc": "var(--bamboo-sage)" };

              return (
                // The reveal class lives on a WRAPPER, never on `.bamboo-card`
                // itself: `.bamboo-js .bamboo-reveal-group.in .bamboo-reveal-item`
                // sets `transform: none` at a higher specificity than
                // `.bamboo .bamboo-card:hover`, so sharing one element would
                // silently kill the card's hover tilt.
                <div
                  key={collection.id}
                  className="bamboo-reveal-item"
                  style={{ "--i": index } as CSSProperties}
                >
                  <article className="bamboo-card group flex h-full flex-col">
                    <div className="bamboo-card-art">
                      <span
                        className="bamboo-blob"
                        style={blob as CSSProperties}
                      />
                      {collection.imageUrl ? (
                        <span
                          className="bamboo-card-photo"
                          style={{ "--aw": "78%" } as CSSProperties}
                        >
                          <Image
                            className="bamboo-card-photo-img"
                            src={collection.imageUrl}
                            alt=""
                            width={1200}
                            height={1011}
                            sizes="(max-width: 620px) 88vw, (max-width: 1080px) 44vw, 30vw"
                          />
                        </span>
                      ) : (
                        <BambooCollectionArt index={index} />
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
                        href={`/collections/${collection.slug}`}
                        className="bamboo-card-link"
                      >
                        {collection.name}
                      </Link>
                    </h3>

                    <div className="bamboo-card-foot mt-2">
                      <span className="text-[0.82rem] font-medium whitespace-nowrap text-[var(--bamboo-pine)]">
                        {count} {count === 1 ? "product" : "products"}
                      </span>
                    </div>

                    {collection.description ? (
                      <p className="mt-3 line-clamp-3 max-w-[36ch] text-[0.9rem] leading-[1.55] text-[var(--bamboo-ink-soft)]">
                        {collection.description}
                      </p>
                    ) : null}

                    <span
                      aria-hidden="true"
                      className={cn(
                        "relative mt-4 inline-block self-start text-[0.95rem] font-medium text-[var(--bamboo-pine)]",
                        "after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:rounded-[2px] after:bg-[var(--bamboo-terracotta)] after:transition-[width] after:duration-300",
                        "group-focus-within:after:w-full group-hover:after:w-full",
                      )}
                    >
                      Shop now →
                    </span>
                  </article>
                </div>
              );
            })}
          </BambooRevealGroup>
        )}
      </section>

      <BambooEdge from="paper" to="pine" variant="c" />
    </div>
  );
}
