import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Suspense } from "react";
import Link from "next/link";

import type { DefaultProductsPageTemplateProps } from "../../types";
import type { GenericTrustBadgeRow } from "~/lib/template-fields";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getListFieldValue,
  parseTemplateTrustBadgesListRows,
} from "~/lib/template-fields";

import { resolveFields } from "..";
import { BambooEdge } from "../shared/bamboo-edge";
import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooReveal } from "../shared/bamboo-reveal";
import { BambooShopClient } from "./bamboo-shop-client";
import { DEFAULT_WHY_STRIP_BENEFITS } from "./index";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse our collection of premium bamboo toilet paper and household paper products. Septic-safe, hypoallergenic, and sustainably crafted.",
};

function whyStripLine(benefits: GenericTrustBadgeRow[]): string {
  return benefits.map((b) => b.label).join(" · ");
}

export async function BambooShopPage({
  business,
}: DefaultProductsPageTemplateProps) {
  const customFields = business.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "bamboo.products.listing-title",
    "bamboo.products.listing-intro",
  ]);
  const benefits =
    parseTemplateTrustBadgesListRows(
      getListFieldValue(customFields, "bamboo.products.why-strip-list"),
      DEFAULT_WHY_STRIP_BENEFITS,
    ) ?? DEFAULT_WHY_STRIP_BENEFITS;
  const showWhyStrip = isSectionVisible(
    customFields,
    "bamboo",
    "products.whyStrip",
  );
  const products = business.products ?? [];

  return (
    // flex column + flex-1 so this root grows to fill <main> (a column flex
    // container) and the trailing pine BambooEdge's mt-auto can pin to the
    // bottom instead of leaving a strip of paper above the footer.
    <div className="flex flex-1 flex-col bg-[var(--bamboo-paper)]">
      {/* ===== hero band: her products on a shelf ===== */}
      <section
        {...sectionGroupAttr("products", "listing")}
        aria-labelledby="bamboo-shop-h"
        className="relative flex min-h-[min(38vh,400px)] items-center overflow-hidden bg-[var(--bamboo-sage)] pt-[118px] pb-[84px] max-[900px]:min-h-0 max-[900px]:items-start max-[900px]:pt-11 max-[900px]:pb-[244px] max-[620px]:pt-[38px] max-[620px]:pb-[216px]"
        style={{ marginTop: "calc(var(--bamboo-header-offset) * -1)" }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          {/* the page's single edge anchor: a crownless "run" culm rooted off
              the left edge, so it is only ever cropped by the band itself */}
          <span
            className="bamboo-el bamboo-el--b bamboo-m-hide"
            style={
              {
                "--w": "148px",
                "--l": "-3.4%",
                "--b": "-118px",
                "--d": ".26s",
              } as CSSProperties
            }
          >
            <span
              className="bamboo-tilt"
              style={{ "--rz": "0deg" } as CSSProperties}
            >
              <span
                className="bamboo-sway"
                style={
                  {
                    "--dur": "8.8s",
                    "--dl": "-2.4s",
                    "--a1": "-.5deg",
                    "--a2": ".55deg",
                  } as CSSProperties
                }
              >
                <BambooGlyph id="s-culm-run" />
              </span>
            </span>
          </span>

          {/* the shelf: one ledge, one ground plane, three products bobbing
              out of sync */}
          <div className="absolute right-[2%] bottom-[30px] aspect-[470/258] w-[min(46%,500px)] max-[900px]:bottom-4 max-[900px]:w-[min(96%,352px)] max-[620px]:w-[min(98%,320px)]">
            <div className="absolute right-[-8%] bottom-[12%] left-[2%] h-[9px] rounded-l-[5px] bg-[var(--bamboo-sage-deep)]" />
            <div className="absolute top-[9px] left-[1.5%] h-[clamp(16px,2.2vw,28px)] w-[9px] rounded-b-[5px] bg-[var(--bamboo-sage-deep)] opacity-[0.72]" />
            <div className="absolute top-[9px] right-[13%] h-[clamp(16px,2.2vw,28px)] w-[9px] rounded-b-[5px] bg-[var(--bamboo-sage-deep)] opacity-[0.72]" />

            {/* her pack — the largest object, left of the ledge */}
            <span
              className="bamboo-el bamboo-el--b"
              style={
                {
                  "--w": "34%",
                  "--l": "9%",
                  "--b": "13.2%",
                  "--d": ".40s",
                } as CSSProperties
              }
            >
              <i
                className="bamboo-shd"
                style={
                  {
                    "--sw": "86%",
                    "--sh": "11%",
                    "--sx": "8px",
                    "--sb": "1%",
                  } as CSSProperties
                }
              />
              <span
                className="bamboo-bob"
                style={
                  {
                    "--dur": "7.4s",
                    "--dl": "-2.2s",
                    "--amp": "4px",
                    "--rot": ".4deg",
                  } as CSSProperties
                }
              >
                <BambooGlyph id="s-pack" />
              </span>
            </span>

            {/* a single roll standing beside it */}
            <span
              className="bamboo-el bamboo-el--b"
              style={
                {
                  "--w": "14.5%",
                  "--l": "47%",
                  "--b": "15%",
                  "--d": ".52s",
                } as CSSProperties
              }
            >
              <i
                className="bamboo-shd"
                style={
                  {
                    "--sw": "92%",
                    "--sh": "14%",
                    "--sx": "5px",
                    "--sb": "-3%",
                  } as CSSProperties
                }
              />
              <span
                className="bamboo-bob"
                style={
                  {
                    "--dur": "6.2s",
                    "--dl": "-4.1s",
                    "--amp": "5px",
                    "--rot": "-1.5deg",
                  } as CSSProperties
                }
              >
                <BambooGlyph id="s-roll-front" />
              </span>
            </span>

            {/* the tissue box closing the ledge on the right */}
            <span
              className="bamboo-el bamboo-el--b"
              style={
                {
                  "--w": "25%",
                  "--l": "66%",
                  "--b": "15%",
                  "--d": ".64s",
                } as CSSProperties
              }
            >
              <i
                className="bamboo-shd"
                style={
                  {
                    "--sw": "90%",
                    "--sh": "15%",
                    "--sx": "4px",
                    "--sb": "-4%",
                  } as CSSProperties
                }
              />
              <span
                className="bamboo-bob"
                style={
                  {
                    "--dur": "5.6s",
                    "--dl": "-1.3s",
                    "--amp": "4px",
                    "--rot": "1deg",
                  } as CSSProperties
                }
              >
                <BambooGlyph id="s-tissue-box" />
              </span>
            </span>
          </div>

          {/* inner-page ambient budget: two drifting leaves on desktop, one
              re-scoped survivor at 390 */}
          <span
            className="bamboo-drift bamboo-shop-drift-1"
            style={
              {
                "--l": "46%",
                "--t": "6%",
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
          <span
            className="bamboo-drift bamboo-m-hide"
            style={
              {
                "--l": "57%",
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
        </div>

        <div className="relative z-1 mx-auto w-[min(1200px,calc(100%-48px))] max-[900px]:max-w-none">
          <div className="max-w-[min(560px,52vw)] max-[900px]:max-w-none">
            <h1
              id="bamboo-shop-h"
              {...fieldAttr("bamboo.products.listing-title")}
              className="font-heading text-[clamp(2.3rem,4.4vw,3.5rem)] leading-[1.08] font-bold tracking-[-.026em] text-[var(--bamboo-pine)]"
            >
              {f["bamboo.products.listing-title"] ?? ""}
            </h1>
            <p
              {...fieldAttr("bamboo.products.listing-intro")}
              className="mt-[18px] max-w-[38ch] text-[1.08rem] leading-[1.6] text-[var(--bamboo-ink)] max-[900px]:max-w-[34ch]"
            >
              {f["bamboo.products.listing-intro"] ?? ""}
            </p>
          </div>
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

      {/* ===== toolbar + product grid ===== */}
      <section
        aria-labelledby="bamboo-shop-catalog-h"
        className="mx-auto max-w-[1200px] px-6 pt-[clamp(30px,3.4vw,52px)] pb-[clamp(58px,6vw,96px)]"
      >
        <h2 id="bamboo-shop-catalog-h" className="sr-only">
          All products
        </h2>

        {products.length === 0 ? (
          <BambooReveal>
            <div className="bamboo-torn-card mx-auto flex max-w-[560px] flex-col items-center gap-4 px-8 py-14 text-center">
              <BambooGlyph id="s-sprig" className="h-auto w-[104px]" />
              <p className="text-[1.05rem] text-[var(--bamboo-ink-soft)]">
                No products available at this time.
              </p>
              <span className="text-[0.9rem] text-[var(--bamboo-muted)]">
                Check back soon — we&apos;re always adding new bamboo
                essentials.
              </span>
            </div>
          </BambooReveal>
        ) : (
          <Suspense>
            <BambooShopClient products={products} />
          </Suspense>
        )}
      </section>

      {/* ===== why bamboo, compact: one strip, no timeline (homepage's) ===== */}
      {showWhyStrip ? (
        <>
          <BambooEdge from="paper" to="sage" variant="b" />
          <section
            {...sectionGroupAttr("products", "whyStrip")}
            aria-labelledby="bamboo-shop-why-h"
            className="bg-[var(--bamboo-sage)] py-[clamp(46px,5.4vw,78px)]"
          >
            <div className="mx-auto flex w-[min(1200px,calc(100%-48px))] flex-wrap items-center gap-x-10 gap-y-4">
              <h2 id="bamboo-shop-why-h" className="sr-only">
                Why bamboo
              </h2>
              <span
                className="w-[clamp(74px,7.5vw,102px)] flex-none"
                aria-hidden="true"
              >
                <BambooGlyph id="s-wreath" className="block h-auto w-full" />
              </span>
              <p className="max-w-[56ch] flex-1 basis-[340px] text-[clamp(1.05rem,1.7vw,1.3rem)] leading-[1.5] text-[var(--bamboo-ink)]">
                {whyStripLine(benefits)}
              </p>
              <Link
                href="/about"
                className="bamboo-swipe ml-auto text-[1.04rem] whitespace-nowrap text-[var(--bamboo-pine)] max-[900px]:ml-0"
              >
                Our Story →
              </Link>
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
