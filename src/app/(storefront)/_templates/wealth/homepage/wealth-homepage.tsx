import type { DefaultHomepageTemplateProps } from "../../types";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { isSectionVisible } from "~/lib/sp-meta";
import { cn } from "~/lib/utils";
import { HydrateClient } from "~/trpc/server";
import { PageTransition } from "~/components/page-animations";

import { resolveFields } from "..";
import { WealthBandSection } from "./wealth-band-section";
import { WealthCooperativeSection } from "./wealth-cooperative-section";
import { WealthCoopsSection } from "./wealth-coops-section";
import { toWealthNewsRows } from "./wealth-homepage-news";
import { WealthMissionSection } from "./wealth-mission-section";
import { WealthNewsSection } from "./wealth-news-section";
import { WealthProgramsSection } from "./wealth-programs-section";
import { WealthSupportSection } from "./wealth-support-section";

const FIELD_KEYS = [
  // Mission
  "wealth.homepage.mission-image",
  "wealth.homepage.mission-image-alt",
  "wealth.homepage.mission-eyebrow",
  "wealth.homepage.mission-statement",
  // Support DCWF
  "wealth.homepage.support-heading",
  "wealth.homepage.support-body",
  "wealth.homepage.support-button-label",
  // Our Programs
  "wealth.homepage.programs-heading",
  "wealth.homepage.programs-intro",
  "wealth.homepage.programs-leadin",
  "wealth.homepage.programs-tile-lending-image",
  "wealth.homepage.programs-tile-lending-label",
  "wealth.homepage.programs-tile-lending-url",
  "wealth.homepage.programs-tile-incubator-image",
  "wealth.homepage.programs-tile-incubator-label",
  "wealth.homepage.programs-tile-incubator-url",
  "wealth.homepage.programs-tile-transitions-image",
  "wealth.homepage.programs-tile-transitions-label",
  "wealth.homepage.programs-tile-transitions-url",
  "wealth.homepage.programs-tile-cend-image",
  "wealth.homepage.programs-tile-cend-label",
  "wealth.homepage.programs-tile-cend-url",
  // Photo band
  "wealth.homepage.band-image",
  "wealth.homepage.band-image-alt",
  // What Is a Cooperative?
  "wealth.homepage.cooperative-heading",
  "wealth.homepage.cooperative-body",
  "wealth.homepage.cooperative-link-label",
  "wealth.homepage.cooperative-link-url",
  // Meet the Co-ops
  "wealth.homepage.coops-image",
  "wealth.homepage.coops-image-alt",
  "wealth.homepage.coops-heading",
  "wealth.homepage.coops-body",
  "wealth.homepage.coops-button-label",
  "wealth.homepage.coops-button-url",
  // In the News
  "wealth.homepage.news-heading",
];

/**
 * Wealth homepage — a thin orchestrator. It owns field resolution, feature
 * flag / visibility gating, and render order; each band's markup lives in
 * its own file (see design.md "Per-page section concepts › Homepage").
 *
 * A11y note: the homepage has no visible page-title H1 (design.md), so a
 * screen-reader-only H1 carrying the business name anchors the document
 * outline; every visible section heading below it (Support DCWF, Our
 * Programs, What Is a Cooperative?, Meet the Co-ops, In the News) is an H2.
 */
export function WealthHomepage({ business }: DefaultHomepageTemplateProps) {
  const customFields = business.siteContent?.customFields as
    | Record<string, unknown>
    | undefined;
  const f = resolveFields(customFields, FIELD_KEYS);

  const { isEnabled } = resolveFlags(business.featureFlags);
  const newsItems = toWealthNewsRows(
    customFields?.["wealth.homepage.news-items"],
  );

  const showSupport =
    isEnabled("donations") &&
    isSectionVisible(customFields, "wealth", "homepage.support");

  // `||` (not `??`) is intentional for every image src below: an unset field
  // resolves to `""` (see `resolveTemplateFields`), never `null`/`undefined`,
  // so `??` would never trigger the fallback to the real cloned asset — see
  // `coop-homepage.tsx` for the same pattern.
  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
  const missionImage =
    f["wealth.homepage.mission-image"] ||
    "/templates/wealth/images/mission-hero.png";
  const tileLendingImage =
    f["wealth.homepage.programs-tile-lending-image"] ||
    "/templates/wealth/images/tile-lending.png";
  const tileIncubatorImage =
    f["wealth.homepage.programs-tile-incubator-image"] ||
    "/templates/wealth/images/tile-incubator.png";
  const tileTransitionsImage =
    f["wealth.homepage.programs-tile-transitions-image"] ||
    "/templates/wealth/images/tile-transitions.png";
  const tileCendImage =
    f["wealth.homepage.programs-tile-cend-image"] ||
    "/templates/wealth/images/tile-cend.png";
  const bandImage =
    f["wealth.homepage.band-image"] ||
    "/templates/wealth/images/event-band.jpg";
  const coopsImage =
    f["wealth.homepage.coops-image"] ||
    "/templates/wealth/images/coops-hero.jpg";
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

  return (
    <HydrateClient>
      <PageTransition>
        <h1 className="sr-only">{business.name}</h1>

        {/*
          Mission + Support DCWF share one 2-col desktop region on the real
          site (a wide mission column with a narrow donate sidebar beside
          it, design.md "Support DCWF sidebar — narrow right column"), not
          two independently stacked full-width sections. Each child keeps
          its own <section data-sp-group> hotspot and reveal; this wrapper
          only supplies the row's shared container/gutter/padding and the
          lg 2-col split (mission ~2/3, support ~1/3, matching the site's
          749px/375px column ratio). Below lg both stack full-width in
          document order, same as each section's own internal breakpoints.
        */}
        <div className="mx-auto w-full [max-width:var(--wealth-container)] px-[var(--wealth-gutter)] py-[calc(var(--wealth-rhythm)*2)]">
          <div
            className={cn(
              "flex flex-col gap-[calc(var(--wealth-rhythm)*1.5)]",
              showSupport &&
                "lg:flex-row lg:items-start lg:gap-[var(--wealth-gutter)]",
            )}
          >
            <div className={showSupport ? "min-w-0 lg:flex-[2]" : "w-full"}>
              <WealthMissionSection
                contained={false}
                className="py-0"
                image={missionImage}
                imageAlt={f["wealth.homepage.mission-image-alt"] ?? ""}
                eyebrow={f["wealth.homepage.mission-eyebrow"] ?? ""}
                statement={f["wealth.homepage.mission-statement"] ?? ""}
              />
            </div>

            {showSupport && (
              <div className="min-w-0 lg:flex-[1]">
                <WealthSupportSection
                  contained={false}
                  className="py-0"
                  heading={f["wealth.homepage.support-heading"] ?? ""}
                  body={f["wealth.homepage.support-body"] ?? ""}
                  buttonLabel={f["wealth.homepage.support-button-label"] ?? ""}
                />
              </div>
            )}
          </div>
        </div>

        {isSectionVisible(customFields, "wealth", "homepage.programs") && (
          <WealthProgramsSection
            heading={f["wealth.homepage.programs-heading"] ?? ""}
            intro={f["wealth.homepage.programs-intro"] ?? ""}
            leadin={f["wealth.homepage.programs-leadin"] ?? ""}
            tiles={[
              {
                key: "lending",
                image: tileLendingImage,
                label: f["wealth.homepage.programs-tile-lending-label"] ?? "",
                url:
                  f["wealth.homepage.programs-tile-lending-url"] ?? "/services",
              },
              {
                key: "incubator",
                image: tileIncubatorImage,
                label: f["wealth.homepage.programs-tile-incubator-label"] ?? "",
                url:
                  f["wealth.homepage.programs-tile-incubator-url"] ??
                  "/services",
              },
              {
                key: "transitions",
                image: tileTransitionsImage,
                label:
                  f["wealth.homepage.programs-tile-transitions-label"] ?? "",
                url:
                  f["wealth.homepage.programs-tile-transitions-url"] ??
                  "/services",
              },
              {
                key: "cend",
                image: tileCendImage,
                label: f["wealth.homepage.programs-tile-cend-label"] ?? "",
                url:
                  f["wealth.homepage.programs-tile-cend-url"] ??
                  "https://www.cendetroit.com/",
              },
            ]}
          />
        )}

        {/*
          Photo band + What Is a Cooperative? are a float pair on the live
          site (photo left ~45%, definition copy right) — same shared-row
          treatment as mission/support above. Each keeps its own hotspot and
          visibility gate; when one is hidden the other falls back to its
          standalone treatment (full-bleed band / centered copy).
        */}
        {(() => {
          const showBand =
            isSectionVisible(customFields, "wealth", "homepage.band") &&
            Boolean(bandImage);
          const showCooperative = isSectionVisible(
            customFields,
            "wealth",
            "homepage.cooperative",
          );
          if (showBand && showCooperative) {
            return (
              <div className="mx-auto w-full [max-width:var(--wealth-container)] px-[var(--wealth-gutter)] py-[calc(var(--wealth-rhythm)*2)]">
                <div className="flex flex-col gap-[calc(var(--wealth-rhythm)*1.5)] lg:flex-row lg:items-center lg:gap-[calc(var(--wealth-gutter)*2)]">
                  <div className="min-w-0 lg:flex-[5]">
                    <WealthBandSection
                      variant="inset"
                      image={bandImage}
                      imageAlt={f["wealth.homepage.band-image-alt"] ?? ""}
                    />
                  </div>
                  <div className="min-w-0 lg:flex-[6]">
                    <WealthCooperativeSection
                      contained={false}
                      className="py-0"
                      heading={f["wealth.homepage.cooperative-heading"] ?? ""}
                      body={f["wealth.homepage.cooperative-body"] ?? ""}
                      linkLabel={
                        f["wealth.homepage.cooperative-link-label"] ?? ""
                      }
                      linkUrl={
                        f["wealth.homepage.cooperative-link-url"] ??
                        "/resources"
                      }
                    />
                  </div>
                </div>
              </div>
            );
          }
          return (
            <>
              {showBand && (
                <WealthBandSection
                  image={bandImage}
                  imageAlt={f["wealth.homepage.band-image-alt"] ?? ""}
                />
              )}
              {showCooperative && (
                <WealthCooperativeSection
                  heading={f["wealth.homepage.cooperative-heading"] ?? ""}
                  body={f["wealth.homepage.cooperative-body"] ?? ""}
                  linkLabel={f["wealth.homepage.cooperative-link-label"] ?? ""}
                  linkUrl={
                    f["wealth.homepage.cooperative-link-url"] ?? "/resources"
                  }
                />
              )}
            </>
          );
        })()}

        {isSectionVisible(customFields, "wealth", "homepage.coops") && (
          <WealthCoopsSection
            image={coopsImage}
            imageAlt={f["wealth.homepage.coops-image-alt"] ?? ""}
            heading={f["wealth.homepage.coops-heading"] ?? ""}
            body={f["wealth.homepage.coops-body"] ?? ""}
            buttonLabel={f["wealth.homepage.coops-button-label"] ?? ""}
            buttonUrl={f["wealth.homepage.coops-button-url"] ?? "/testimonials"}
          />
        )}

        {isSectionVisible(customFields, "wealth", "homepage.news") && (
          <WealthNewsSection
            heading={f["wealth.homepage.news-heading"] ?? ""}
            items={newsItems}
          />
        )}
      </PageTransition>
    </HydrateClient>
  );
}
