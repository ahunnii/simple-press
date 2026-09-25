import type { SectionTone } from "../shared/preceding-tone";
import { listItemAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import {
  FadeIn,
  StaggerContainer,
  StaggerItem,
} from "~/components/page-animations";

import { DEFAULT_BAMBOO_FEATURES } from ".";
import { resolveFields } from "..";
import { BambooWaveDivider } from "../shared/bamboo-wave-divider";
import {
  BambooWaveLeaves,
  BambooWaveSprig,
  BAND_WAVE_SPRIG_ROOT,
  BAND_WAVE_SPRIG_SIZE,
} from "../shared/bamboo-wave-leaves";
import { BambooSectionHeading } from "./bamboo-section-heading";

type Props = {
  customFields: unknown;
  /**
   * Whether a homepage band (Testimonials or Location) renders after this
   * one. When false the footer follows directly and brings its own wave, so
   * the bottom wave is skipped (see the note on the bottom wave below).
   */
  hasFollowingSection: boolean;
  /**
   * What actually renders directly above this band, computed by the
   * homepage orchestrator (`bamboo-homepage.tsx`) via
   * `shared/preceding-tone.ts`, since a hidden Featured/aboutTeaser/value
   * band can promote a different-toned section into this seam. "cream" is
   * the default (no backing needed, the page's own cream shows through the
   * wave's transparent-above area); "cream-deep" backs the wave with a
   * matching strip so the seam doesn't show a sliver of the wrong cream;
   * "forest" (the value band, when both Featured and aboutTeaser are
   * hidden) means forest sits directly above forest, so there's no seam to
   * mark — the top wave (and its wave-sprig leaves, which are rooted on the
   * wave's line) are skipped entirely and the band just continues flat, the
   * same "same-color runs merge, no wave" rule the About page uses.
   */
  precedingTone: SectionTone;
};

/**
 * Forest banner — the only place on the homepage where the icon rows go
 * gold-soft. Per the Backgrounds convention (docs/templates/bamboo/design.md),
 * the `<section>` itself carries no background; the forest color lives on the
 * full-bleed inner div, framed top and bottom by the shared wave divider so
 * the cream sections above (Featured) and below (Testimonials) flow in
 * instead of hitting a hard edge. The bottom wave uses `flip` so the crest
 * lands on the opposite side and the forest hugs the seam. Both edges use the
 * vivid metallic `hairline` line, like the value band.
 *
 * Leaves grow on the TOP wave only (the value band's wave-sprig treatment,
 * via `shared/bamboo-wave-leaves.tsx`), rising over the bottom padding of
 * whatever cream/cream-deep band precedes (see `precedingTone` below). The
 * bottom edge stays plain: the footer, which carries its own sprig, can
 * follow it directly (and when it does, the bottom wave is skipped entirely,
 * see `hasFollowingSection`). The section is `relative` so the leaf layer's
 * `top-*` is measured from the top wave's top edge, and `overflow-x-clip`
 * (clip, not hidden, so the upward overflow still paints) keeps horizontal
 * scroll at zero.
 *
 * `precedingTone` (added so hiding Featured/aboutTeaser/the value band never
 * strands this seam): the top wave's transparent-above area shows whatever
 * paints behind it, so it needs a backing strip whenever the actual
 * preceding section isn't the page's own flat cream, and needs to be
 * skipped entirely when forest is promoted directly above (no seam to
 * mark — the band just continues flat into the value band above it).
 */
export function BambooSustainabilitySection({
  customFields,
  hasFollowingSection,
  precedingTone,
}: Props) {
  const f = resolveFields(customFields, [
    "bamboo.homepage.sustainability-eyebrow",
    "bamboo.homepage.sustainability-heading",
  ]);

  const features =
    parseTemplateIconListRows(
      getListFieldValue(customFields, "bamboo.homepage.sustainability-list"),
      DEFAULT_BAMBOO_FEATURES,
    ) ?? [];

  // Forest directly above means there's no seam to mark: omit the top wave
  // (and its wave-sprig leaves, which are rooted on the wave's line) and let
  // the band continue flat, same as the About page's same-color-run rule.
  const showTopWave = precedingTone !== "forest";

  return (
    <section
      {...sectionGroupAttr("homepage", "sustainability")}
      aria-label="Sustainability"
      className="relative overflow-x-clip"
    >
      {showTopWave && (
        <div
          className={
            precedingTone === "cream-deep"
              ? "bg-[var(--bam-cream-deep)]"
              : undefined
          }
        >
          <BambooWaveDivider
            variant="hairline"
            className="-mb-px h-14 md:h-24"
          />
        </div>
      )}

      <div className="bg-[var(--bam-forest)]">
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-32 lg:px-8">
          <FadeIn direction="up">
            <BambooSectionHeading
              tone="forest"
              eyebrow={f["bamboo.homepage.sustainability-eyebrow"] ?? ""}
              eyebrowFieldKey="bamboo.homepage.sustainability-eyebrow"
              heading={f["bamboo.homepage.sustainability-heading"] ?? ""}
              headingFieldKey="bamboo.homepage.sustainability-heading"
              className="mb-16"
            />
          </FadeIn>

          {/* happy-bamboo's benefits grid steps 1 → 2 → n columns on the same
              `gap-6` gutter. The row gap stays generous because these items are
              bare icon columns, not the padded Cards happy-bamboo uses; the
              column count tops out at 3 because the field caps at 4 rows and a
              4-up track would strand the default three-item set. */}
          <StaggerContainer
            className="grid grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3"
            staggerDelay={0.1}
          >
            {features.map((feature, index) => (
              <StaggerItem
                key={`${feature.title}-${index}`}
                {...listItemAttr("bamboo.homepage.sustainability-list", index)}
                className="flex flex-col items-center gap-4 text-center"
              >
                <span
                  className="flex size-14 shrink-0 items-center justify-center rounded-full border border-[var(--bam-gold-soft)]/60"
                  aria-hidden="true"
                >
                  <feature.icon className="size-6 text-[var(--bam-gold-soft)]" />
                </span>
                <h3 className="font-heading text-xl text-[var(--bam-cream)]">
                  {feature.title}
                </h3>
                {feature.description ? (
                  <p className="max-w-xs text-sm leading-relaxed text-pretty text-[var(--bam-cream)]/75">
                    {feature.description}
                  </p>
                ) : null}
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>

      {/* The next band varies (Testimonials is data-conditional, so cream-deep
          Location can follow directly). The negative bottom margin slides that
          neighbor up beneath the wave so its own background shows through the
          transparent side — same composite contract as the footer lip. Both
          possible neighbors pad py-20 md:py-32, comfortably deeper than the
          h-14/md:h-24 overlap. The footer pads only py-16, so when it follows
          directly this z-[1] wave would cover its first row (it hid the
          "Connect" heading) and stack a second gold line under the footer's
          own; like the About CTA, the band then ends flat and lets the
          footer's wave mark the seam. */}
      {hasFollowingSection && (
        <BambooWaveDivider
          flip
          variant="hairline"
          className="pointer-events-none relative z-[1] -mt-px -mb-14 h-14 md:-mb-24 md:h-24"
        />
      )}

      {showTopWave && (
        <BambooWaveLeaves className="z-[2]">
          <BambooWaveSprig
            side="left"
            className={`${BAND_WAVE_SPRIG_ROOT.left} ${BAND_WAVE_SPRIG_SIZE}`}
          />
          <BambooWaveSprig
            side="right"
            className={`${BAND_WAVE_SPRIG_ROOT.right} ${BAND_WAVE_SPRIG_SIZE}`}
          />
        </BambooWaveLeaves>
      )}
    </section>
  );
}
