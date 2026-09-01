import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultAboutPageTemplateProps } from "../../types";
import type { BambooGlyphId } from "../shared/bamboo-glyph";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { isSectionVisible } from "~/lib/sp-meta";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";

import {
  DEFAULT_BAMBOO_NATIONWIDE_FACTS,
  DEFAULT_BAMBOO_VALUES,
  DEFAULT_BAMBOO_WHY_BAMBOO_FACTS,
} from ".";
import { resolveFields } from "..";
import { BambooEdge } from "../shared/bamboo-edge";
import { BambooGlyph } from "../shared/bamboo-glyph";
import { BambooReveal, BambooRevealGroup } from "../shared/bamboo-reveal";
import {
  DetroitSkylineVignette,
  MissionPhotoFallback,
  ValuesGroveVignette,
} from "./bamboo-about-illustrations";
import { BambooReachTimeline } from "./bamboo-reach-timeline";

/**
 * About page — "Illustrated & Alive" redesign. Structure and copy ported
 * from `docs/templates/bamboo/build/mockup-refs/mockup-b-about.elided.html`
 * plus `docs/templates/bamboo/mockups/content-pack-pages.md` §3 (the
 * verbatim live narrative). See `docs/templates/bamboo/build/reports/s3-w2.md`
 * for the full field delta and section-order rationale.
 */

const VALUE_LEAVES: BambooGlyphId[] = ["s-leaf-d", "s-leaf", "s-leaf-l"];
const REACH_DISCS: BambooGlyphId[] = ["s-truck", "s-shops", "s-shield"];

export function BambooAboutPage({ business }: DefaultAboutPageTemplateProps) {
  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, [
    "bamboo.about.hero-heading",
    "bamboo.about.hero-intro",
    "bamboo.about.hero-image",
    "bamboo.about.mission-heading",
    "bamboo.about.mission-image",
    "bamboo.about.mission-paragraph",
    "bamboo.about.detroit-heading",
    "bamboo.about.detroit-body",
    "bamboo.about.values-heading",
    "bamboo.about.why-bamboo-heading",
    "bamboo.about.why-bamboo-intro",
    "bamboo.about.supplier-heading",
    "bamboo.about.supplier-text",
    "bamboo.about.label-heading",
    "bamboo.about.label-body",
    "bamboo.about.label-image",
    "bamboo.about.nationwide-heading",
    "bamboo.about.nationwide-text",
    "bamboo.about.cta-heading",
    "bamboo.about.cta-text",
    "bamboo.about.cta-button-link",
    "bamboo.about.cta-button-text",
    "bamboo.about.cta-secondary-button-link",
    "bamboo.about.cta-secondary-button-text",
  ]);

  const valuesList = parseTemplateIconListRows(
    getListFieldValue(customFields, "bamboo.about.values-list"),
    DEFAULT_BAMBOO_VALUES,
  );
  const whyBambooFacts = parseTemplateIconListRows(
    getListFieldValue(customFields, "bamboo.about.why-bamboo-facts-list"),
    DEFAULT_BAMBOO_WHY_BAMBOO_FACTS,
  );
  const nationwideList = parseTemplateIconListRows(
    getListFieldValue(customFields, "bamboo.about.nationwide-facts-list"),
    DEFAULT_BAMBOO_NATIONWIDE_FACTS,
  )?.slice(0, 3);

  // hero-image ships an EMPTY default (not /placeholder.svg) — it's a bonus
  // accent layered onto the illustrated skyline, not a required photo slot.
  const heroImage = f["bamboo.about.hero-image"] ?? "";
  const hasHeroImage = heroImage.trim() !== "";

  const missionImage = f["bamboo.about.mission-image"] ?? "/placeholder.svg";
  const hasMissionImage =
    missionImage.trim() !== "" && missionImage !== "/placeholder.svg";

  const labelImage = f["bamboo.about.label-image"] ?? "/placeholder.svg";
  const hasLabelImage = labelImage !== "/placeholder.svg";

  // Hideable sections drive both their own render AND which torn-leaf edges
  // appear — a hidden band must not leave an orphaned color transition.
  const whyBambooVisible = isSectionVisible(
    customFields,
    "bamboo",
    "about.whyBamboo",
  );
  const supplierVisible = isSectionVisible(
    customFields,
    "bamboo",
    "about.supplier",
  );
  const labelVisible = isSectionVisible(customFields, "bamboo", "about.label");
  const nationwideVisible = isSectionVisible(
    customFields,
    "bamboo",
    "about.nationwide",
  );
  const ctaVisible = isSectionVisible(customFields, "bamboo", "about.cta");
  // The back half of the page (label / nationwide / cta) sits on sage per the
  // mockup; if all three are hidden the page ends on paper instead, and the
  // closing edge into the footer adjusts to match (see the final BambooEdge).
  const showSageTail = labelVisible || nationwideVisible || ctaVisible;

  return (
    <div>
      {/* 1. Hero — short sage band, one culm edge anchor + 3 drifting leaves
          (the page's whole inner-page ambient budget), enlarged Detroit
          skyline vignette. */}
      <section
        {...sectionGroupAttr("about", "hero")}
        aria-labelledby="bamboo-about-hero-h"
        className="relative overflow-hidden bg-[var(--bamboo-sage)] pt-[76px] pb-11 md:pt-[114px] md:pb-[58px]"
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <span
            className="bamboo-el bamboo-el--b bamboo-m-hide"
            style={
              {
                "--w": "152px",
                "--l": "-3.4%",
                "--b": "-176px",
                "--d": ".26s",
              } as CSSProperties
            }
          >
            <span className="bamboo-tilt">
              <span
                className="bamboo-sway"
                style={
                  {
                    "--dur": "8.6s",
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
          <span
            className="bamboo-drift bamboo-about-d1"
            style={
              {
                "--l": "33%",
                "--t": "9%",
                "--w": "29px",
                "--dur": "16s",
                "--dl": "-3s",
                "--dx": "96px",
                "--dy": "340px",
                "--dr": "170deg",
              } as CSSProperties
            }
          >
            <BambooGlyph id="s-leaf" />
          </span>
          <span
            className="bamboo-drift bamboo-about-d2"
            style={
              {
                "--l": "45%",
                "--t": "4%",
                "--w": "23px",
                "--dur": "19s",
                "--dl": "-10s",
                "--dx": "-72px",
                "--dy": "370px",
                "--dr": "-150deg",
              } as CSSProperties
            }
          >
            <BambooGlyph id="s-leaf-d" />
          </span>
          <span
            className="bamboo-drift bamboo-m-hide"
            style={
              {
                "--l": "25%",
                "--t": "26%",
                "--w": "21px",
                "--dur": "17s",
                "--dl": "-6s",
                "--dx": "74px",
                "--dy": "280px",
                "--dr": "190deg",
              } as CSSProperties
            }
          >
            <BambooGlyph id="s-leaf-l" />
          </span>
        </div>

        <div className="relative z-2 mx-auto grid w-[min(1200px,calc(100%-48px))] items-center gap-7 md:grid-cols-2 md:gap-[clamp(28px,4vw,60px)]">
          <div>
            <h1
              id="bamboo-about-hero-h"
              className="font-heading max-w-[13ch] text-[clamp(2.25rem,4.4vw,3.6rem)] font-bold tracking-[-0.03em] text-[var(--bamboo-pine)]"
            >
              <span {...fieldAttr("bamboo.about.hero-heading")}>
                {f["bamboo.about.hero-heading"] ?? ""}
              </span>
            </h1>
            <p
              className="mt-5 max-w-[47ch] text-[1.05rem] leading-[1.62] text-[var(--bamboo-ink)]"
              {...fieldAttr("bamboo.about.hero-intro")}
            >
              {f["bamboo.about.hero-intro"] ?? ""}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] md:mr-0 md:ml-auto">
            <div
              className="overflow-hidden rounded-[26px]"
              style={{
                boxShadow:
                  "0 26px 50px -38px rgb(var(--bamboo-ill-ground-shadow-rgb) / 0.5)",
              }}
            >
              <DetroitSkylineVignette />
            </div>
            {hasHeroImage && (
              <div className="absolute bottom-3 left-3 w-[34%] max-w-[150px] -rotate-3">
                <span className="bamboo-photo-card block">
                  <Image
                    src={heroImage}
                    alt=""
                    width={300}
                    height={300}
                    className="aspect-square w-full object-cover"
                    sizes="150px"
                  />
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <BambooEdge
        from="sage"
        to="paper"
        variant="a"
        leaves={[
          { id: "s-leaf-d", l: "16%", t: "6%", w: "27px", r: "-24deg" },
          { id: "s-leaf", l: "52%", t: "32%", w: "22px", r: "18deg" },
          { id: "s-leaf-l", l: "79%", t: "2%", w: "25px", r: "-9deg" },
        ]}
      />

      {/* 2. Mission — "Why We Started" */}
      <section
        {...sectionGroupAttr("about", "mission")}
        aria-labelledby="bamboo-mission-h"
        className="bg-[var(--bamboo-paper)] py-11 md:py-[54px]"
      >
        <div className="mx-auto grid w-[min(1200px,calc(100%-48px))] items-start gap-8 md:grid-cols-[1.1fr_0.9fr] md:gap-[clamp(34px,5vw,76px)]">
          <BambooReveal>
            <h2
              id="bamboo-mission-h"
              className="font-heading text-[clamp(1.85rem,3.1vw,2.7rem)] font-bold text-[var(--bamboo-pine)]"
              {...fieldAttr("bamboo.about.mission-heading")}
            >
              {f["bamboo.about.mission-heading"] ?? ""}
            </h2>
            <p
              className="mt-5 max-w-[60ch] whitespace-pre-line text-[var(--bamboo-ink-soft)]"
              {...fieldAttr("bamboo.about.mission-paragraph")}
            >
              {f["bamboo.about.mission-paragraph"] ?? ""}
            </p>
          </BambooReveal>

          {/* Permanent tilt lives on this plain outer div, not on
              `BambooReveal` — `.bamboo-reveal`/`.in` manage their own
              `transform` (translateY) for the fade-up entrance, so a rotate
              utility on that same element would fight over one property. */}
          <div className="mx-auto w-full max-w-[330px] -rotate-[1.7deg] md:mx-0">
            <BambooReveal
              className="bamboo-photo-card relative"
              style={{ "--rd": "140ms" } as React.CSSProperties}
            >
              {hasMissionImage ? (
                <Image
                  src={missionImage}
                  alt=""
                  width={1080}
                  height={1080}
                  className="aspect-square w-full object-cover"
                  sizes="(max-width: 768px) 90vw, 330px"
                />
              ) : (
                <div className="aspect-square w-full overflow-hidden rounded-[8px]">
                  <MissionPhotoFallback />
                </div>
              )}
              <span aria-hidden="true" className="bamboo-photo-badge">
                <BambooGlyph id="s-wreath" />
              </span>
            </BambooReveal>
          </div>
        </div>
      </section>

      {/* 3. Rooted in Detroit — breather band */}
      <section
        {...sectionGroupAttr("about", "detroit")}
        aria-labelledby="bamboo-detroit-h"
        className="bg-[var(--bamboo-paper)] py-9 md:py-11"
      >
        <div className="mx-auto w-[min(1200px,calc(100%-48px))]">
          <BambooReveal className="mx-auto max-w-[690px] text-center">
            <p
              aria-hidden="true"
              className="mb-5 flex items-center justify-center gap-3"
            >
              <i className="block h-0.5 w-[46px] rounded-full bg-[var(--bamboo-sage-deep)]" />
              <BambooGlyph id="s-leaf" className="h-auto w-[26px]" />
              <i className="block h-0.5 w-[46px] rounded-full bg-[var(--bamboo-sage-deep)]" />
            </p>
            <h2
              id="bamboo-detroit-h"
              className="font-heading text-[clamp(1.5rem,2.5vw,2.1rem)] font-bold text-[var(--bamboo-pine)]"
              {...fieldAttr("bamboo.about.detroit-heading")}
            >
              {f["bamboo.about.detroit-heading"] ?? ""}
            </h2>
            <p
              className="mx-auto mt-[18px] max-w-[58ch] text-[var(--bamboo-ink-soft)]"
              {...fieldAttr("bamboo.about.detroit-body")}
            >
              {f["bamboo.about.detroit-body"] ?? ""}
            </p>
          </BambooReveal>
        </div>
      </section>

      {/* 4. Values — leaf-bulleted list beside the illustrated vignette */}
      <section
        {...sectionGroupAttr("about", "values")}
        aria-labelledby="bamboo-values-h"
        className="bg-[var(--bamboo-paper)] pt-9 pb-11 md:pt-[52px] md:pb-[54px]"
      >
        <div className="mx-auto grid w-[min(1200px,calc(100%-48px))] items-center gap-10 md:grid-cols-2 md:gap-[clamp(40px,5vw,84px)]">
          <BambooReveal>
            <h2
              id="bamboo-values-h"
              className="font-heading text-[clamp(2rem,3.4vw,2.95rem)] font-bold text-[var(--bamboo-pine)]"
              {...fieldAttr("bamboo.about.values-heading")}
            >
              {f["bamboo.about.values-heading"] ?? ""}
            </h2>
            {valuesList && valuesList.length > 0 && (
              <ul className="mt-8 grid max-w-[52ch] list-none gap-[18px] p-0">
                {valuesList.map((value, i) => (
                  <li
                    key={`${value.title}-${i}`}
                    className="grid grid-cols-[26px_1fr] items-start gap-3.5"
                  >
                    <BambooGlyph
                      id={VALUE_LEAVES[i % VALUE_LEAVES.length] ?? "s-leaf"}
                      className="mt-1 h-auto w-[26px]"
                    />
                    <div>
                      <b className="font-heading block text-[1.06rem] font-semibold text-[var(--bamboo-pine)]">
                        {value.title}
                      </b>
                      <span className="text-[.98rem] text-[var(--bamboo-ink-soft)]">
                        {value.description}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </BambooReveal>

          <BambooReveal
            className="order-first overflow-hidden rounded-[26px] bg-[var(--bamboo-sage)] shadow-[var(--bamboo-soft-lg)] md:order-none"
            style={{ "--rd": "120ms" } as React.CSSProperties}
          >
            <ValuesGroveVignette />
          </BambooReveal>
        </div>
      </section>

      {/* 5. Why Bamboo — hideable facts band */}
      {whyBambooVisible && (
        <section
          {...sectionGroupAttr("about", "whyBamboo")}
          aria-labelledby="bamboo-why-bamboo-h"
          className="bg-[var(--bamboo-paper)] py-11 md:py-[54px]"
        >
          <div className="mx-auto w-[min(1200px,calc(100%-48px))]">
            <BambooReveal className="mx-auto max-w-[660px] text-center">
              <h2
                id="bamboo-why-bamboo-h"
                className="font-heading text-[clamp(2rem,3.4vw,2.95rem)] font-bold text-[var(--bamboo-pine)]"
                {...fieldAttr("bamboo.about.why-bamboo-heading")}
              >
                {f["bamboo.about.why-bamboo-heading"] ?? ""}
              </h2>
              <p
                className="mx-auto mt-4 max-w-[56ch] text-[var(--bamboo-ink-soft)]"
                {...fieldAttr("bamboo.about.why-bamboo-intro")}
              >
                {f["bamboo.about.why-bamboo-intro"] ?? ""}
              </p>
            </BambooReveal>

            {whyBambooFacts && whyBambooFacts.length > 0 && (
              <BambooRevealGroup className="mt-12 grid gap-8 md:grid-cols-3">
                {whyBambooFacts.map((item, i) => (
                  <div
                    key={`${item.title}-${i}`}
                    className="bamboo-reveal-item flex flex-col items-center gap-3 text-center"
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <div
                      aria-hidden="true"
                      className="flex size-12 items-center justify-center rounded-full bg-[var(--bamboo-sage)]"
                    >
                      <item.icon className="size-6 text-[var(--bamboo-pine)]" />
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-[var(--bamboo-pine)]">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-[var(--bamboo-ink-soft)]">
                      {item.description}
                    </p>
                  </div>
                ))}
              </BambooRevealGroup>
            )}
          </div>
        </section>
      )}

      {/* 6. Supplier — text-only prose band (hideable) */}
      {supplierVisible && (
        <section
          {...sectionGroupAttr("about", "supplier")}
          aria-labelledby="bamboo-supplier-h"
          className="bg-[var(--bamboo-paper)] py-11 md:py-[54px]"
        >
          <div className="mx-auto w-[min(1200px,calc(100%-48px))]">
            <BambooReveal className="mx-auto max-w-[690px] text-center">
              <h2
                id="bamboo-supplier-h"
                className="font-heading text-[clamp(1.85rem,3.1vw,2.7rem)] font-bold text-[var(--bamboo-pine)]"
                {...fieldAttr("bamboo.about.supplier-heading")}
              >
                {f["bamboo.about.supplier-heading"] ?? ""}
              </h2>
              <p
                className="mx-auto mt-[18px] max-w-[58ch] whitespace-pre-line text-[var(--bamboo-ink-soft)]"
                {...fieldAttr("bamboo.about.supplier-text")}
              >
                {f["bamboo.about.supplier-text"] ?? ""}
              </p>
            </BambooReveal>
          </div>
        </section>
      )}

      {showSageTail && <BambooEdge from="paper" to="sage" variant="b" />}

      {/* 7. Our Label — hideable */}
      {labelVisible && (
        <section
          {...sectionGroupAttr("about", "label")}
          aria-labelledby="bamboo-label-h"
          className="bg-[var(--bamboo-sage)] py-9 md:py-11"
        >
          <div className="mx-auto grid w-[min(1200px,calc(100%-48px))] items-center gap-8 md:grid-cols-[.86fr_1.14fr] md:gap-[clamp(32px,4.5vw,72px)]">
            {/* Permanent tilt on the plain outer div — see the mission-image
                comment above for why it can't live on `BambooReveal`. */}
            <div className="mx-auto w-full max-w-[330px] rotate-[1.7deg] md:max-w-[392px]">
              <BambooReveal className="bamboo-photo-card relative">
                {hasLabelImage ? (
                  <Image
                    src={labelImage}
                    alt=""
                    width={758}
                    height={740}
                    className="aspect-[758/740] w-full object-cover"
                    sizes="(max-width: 768px) 90vw, 392px"
                  />
                ) : (
                  <div className="relative grid aspect-[758/740] w-full place-items-center overflow-hidden rounded-lg bg-[var(--bamboo-paper)]">
                    <span
                      aria-hidden="true"
                      className="bamboo-blob"
                      style={
                        {
                          "--bc": "var(--bamboo-sage)",
                          "--br": "-6deg",
                          "--bw": "76%",
                          "--bh": "72%",
                        } as React.CSSProperties
                      }
                    />
                    <BambooGlyph
                      id="s-wreath"
                      label={`${business?.name ?? "Our"} wreath mark`}
                      className="relative h-[44%] w-auto"
                    />
                  </div>
                )}
              </BambooReveal>
            </div>

            <BambooReveal style={{ "--rd": "120ms" } as React.CSSProperties}>
              <BambooGlyph
                id="s-wreath"
                className="mb-4 block h-[76px] w-auto"
              />
              <h2
                id="bamboo-label-h"
                className="font-heading text-[clamp(1.85rem,3.1vw,2.7rem)] font-bold text-[var(--bamboo-pine)]"
                {...fieldAttr("bamboo.about.label-heading")}
              >
                {f["bamboo.about.label-heading"] ?? ""}
              </h2>
              <p
                className="mt-[18px] max-w-[56ch] text-[var(--bamboo-ink-soft)]"
                {...fieldAttr("bamboo.about.label-body")}
              >
                {f["bamboo.about.label-body"] ?? ""}
              </p>
            </BambooReveal>
          </div>
        </section>
      )}

      {/* 8. Nationwide reach band — "no drawing culm", fixed disc art */}
      {nationwideVisible && (
        <section
          {...sectionGroupAttr("about", "nationwide")}
          aria-labelledby="bamboo-nationwide-h"
          className={cn(
            "bg-[var(--bamboo-sage)]",
            labelVisible ? "py-8 md:py-11" : "py-9 md:py-[54px]",
          )}
        >
          <div className="mx-auto w-[min(1200px,calc(100%-48px))]">
            <BambooReveal className="mx-auto max-w-[660px] text-center">
              <h2
                id="bamboo-nationwide-h"
                className="font-heading text-[clamp(2rem,3.4vw,2.95rem)] font-bold text-[var(--bamboo-pine)]"
                {...fieldAttr("bamboo.about.nationwide-heading")}
              >
                {f["bamboo.about.nationwide-heading"] ?? ""}
              </h2>
              <p
                className="mx-auto mt-4 max-w-[56ch] text-[var(--bamboo-ink-soft)]"
                {...fieldAttr("bamboo.about.nationwide-text")}
              >
                {f["bamboo.about.nationwide-text"] ?? ""}
              </p>
            </BambooReveal>

            {nationwideList && nationwideList.length > 0 && (
              <BambooReachTimeline className="mt-[52px]">
                <div className="bamboo-tl-stations">
                  {nationwideList.map((item, i) => (
                    <div
                      key={`${item.title}-${i}`}
                      className="bamboo-station"
                      // Was `0.25 + i * 0.4` (station 3 didn't finish its
                      // 0.6s opacity/transform transition until 1.65s after
                      // `.drawn` fires) — the third station's heading/body
                      // sat mid-transition long enough to read as muted grey
                      // rather than pine/ink whenever it was captured inside
                      // that window. Matches the ~90-180ms cascade used
                      // everywhere else in this template (`.bamboo-reveal-item`,
                      // the other `--rd` stagger values) so all three
                      // stations settle to their full pine/ink color well
                      // inside a typical post-reveal capture.
                      style={
                        { "--sd": `${0.1 + i * 0.12}s` } as React.CSSProperties
                      }
                    >
                      <span className="bamboo-disc">
                        <BambooGlyph
                          id={REACH_DISCS[i % REACH_DISCS.length] ?? "s-truck"}
                          label={item.title}
                        />
                      </span>
                      <div>
                        <h3 className="font-heading mt-[22px] text-[1.3rem] text-[var(--bamboo-pine)] max-[900px]:mt-0.5">
                          {item.title}
                        </h3>
                        <p className="mt-2.5 max-w-[34ch] text-[var(--bamboo-ink)]">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </BambooReachTimeline>
            )}
          </div>
        </section>
      )}

      {/* 9. Closing CTA — hideable */}
      {ctaVisible && (
        <section
          {...sectionGroupAttr("about", "cta")}
          aria-labelledby="bamboo-about-cta-h"
          className="bg-[var(--bamboo-sage)] pt-6 pb-14 text-center md:pt-[42px] md:pb-[92px]"
        >
          <BambooReveal className="mx-auto w-[min(600px,calc(100%-48px))]">
            <p aria-hidden="true" className="mb-[18px] flex justify-center">
              <BambooGlyph id="s-sprig" className="h-auto w-[84px]" />
            </p>
            <h2
              id="bamboo-about-cta-h"
              className="font-heading text-[clamp(1.85rem,3.1vw,2.7rem)] font-bold text-[var(--bamboo-pine)]"
              {...fieldAttr("bamboo.about.cta-heading")}
            >
              {f["bamboo.about.cta-heading"] ?? ""}
            </h2>
            <p
              className="mx-auto mt-4 max-w-[52ch] text-[var(--bamboo-ink-soft)]"
              {...fieldAttr("bamboo.about.cta-text")}
            >
              {f["bamboo.about.cta-text"] ?? ""}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href={f["bamboo.about.cta-button-link"] ?? "/shop"}
                className="bamboo-btn bamboo-btn-primary"
              >
                <span {...fieldAttr("bamboo.about.cta-button-text")}>
                  {f["bamboo.about.cta-button-text"] ?? ""}
                </span>
              </Link>
              <Link
                href={f["bamboo.about.cta-secondary-button-link"] ?? "/contact"}
                className="bamboo-btn bamboo-btn-ghost"
              >
                <span {...fieldAttr("bamboo.about.cta-secondary-button-text")}>
                  {f["bamboo.about.cta-secondary-button-text"] ?? ""}
                </span>
              </Link>
            </div>
          </BambooReveal>
        </section>
      )}

      <BambooEdge
        from={showSageTail ? "sage" : "paper"}
        to="pine"
        variant="c"
      />
    </div>
  );
}
