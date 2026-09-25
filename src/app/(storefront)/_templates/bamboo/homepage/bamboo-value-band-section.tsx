import { listItemAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import {
  getListFieldValue,
  parseTemplateIconListRows,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { StaggerContainer, StaggerItem } from "~/components/page-animations";

import { DEFAULT_BAMBOO_VALUE_BAND } from ".";
import { BambooLeafSprig } from "../shared/bamboo-leaf-sprig";
import { BambooWaveDivider } from "../shared/bamboo-wave-divider";
import {
  BambooWaveLeaves,
  BambooWaveSprig,
  BAND_WAVE_SPRIG_ROOT,
  BAND_WAVE_SPRIG_SIZE,
} from "../shared/bamboo-wave-leaves";

type Props = { customFields: unknown };

/**
 * Gold wave → green value band, bamboo's third signature moment.
 *
 * The wave is `shared/bamboo-wave-divider.tsx` (canonical geometry, tokens
 * only) — a RECORDED deliberate divergence from the happy-bamboo lineage
 * (docs/templates/bamboo/design.md, "Deliberate divergences").
 *
 * **Composite seam (mock-driven):** the wave wrapper no longer paints its own
 * cream backing — it's `variant="hairline"` (a thin bright line tracing the
 * body curve, no filled lip) and sits directly on top of the hero via
 * `-mt-14 md:-mt-24`, the exact negative of its own height. That pulls this
 * band's DOM up so the hairline paints over the hero's last ~14/24 (mobile/
 * desktop) rem-scaled px instead of after them, which is what lets the hero's
 * photo (or flat cream, when no bg image is set) run straight down into the
 * wave instead of stopping at a hard band edge. Stacking-order reasoning:
 * this wrapper is `relative z-[3]`, and the hero section it overlaps is
 * `relative overflow-hidden` but carries no z-index of its own — a
 * `position: relative` element with `z-index: auto` does NOT create a
 * stacking context, so its `z-[2]` content grid (and `z-[1]` scrim/fade
 * layers) stack in the same context as this wrapper's `z-[3]`, and 3 beats 2.
 * (If the hero section ever gained its own z-index, it would create a new
 * stacking context and trap its children below anything outside it
 * regardless of z-value — it doesn't, so this holds.) With no hero bg image,
 * the wave's transparent-above area simply shows the hero's flat cream
 * background through, which is the correct no-photo look.
 */
export function BambooValueBandSection({ customFields }: Props) {
  const items =
    parseTemplateIconListRows(
      getListFieldValue(customFields, "bamboo.homepage.value-band-items"),
      DEFAULT_BAMBOO_VALUE_BAND,
    ) ?? [];

  if (items.length === 0) return null;

  return (
    <section
      {...sectionGroupAttr("homepage", "valueBand")}
      aria-label="What we stand for"
      className="relative overflow-x-clip"
    >
      <div className="pointer-events-none relative z-[3] -mt-14 md:-mt-24">
        <BambooWaveDivider variant="hairline" className="-mb-px h-14 md:h-24" />
      </div>

      <div className="relative overflow-hidden bg-[var(--bam-forest)]">
        <div className="relative mx-auto max-w-7xl px-4 pt-6 pb-20 lg:px-8 lg:pt-8 xl:px-16">
          <StaggerContainer
            className="grid grid-cols-2 gap-y-10 md:grid-cols-4 md:gap-y-0"
            staggerDelay={0.1}
          >
            {items.slice(0, 4).map((item, index) => (
              <StaggerItem
                key={`${item.title}-${index}`}
                {...listItemAttr("bamboo.homepage.value-band-items", index)}
                className={cn(
                  "flex flex-col items-center gap-3 px-3 text-center lg:px-6",
                  index > 0 &&
                    "md:border-l md:border-[var(--bam-gold-soft)]/25",
                )}
              >
                <item.icon
                  aria-hidden="true"
                  className="size-8 text-[var(--bam-gold-vivid)]"
                  strokeWidth={1.25}
                />
                <p className="max-w-[15rem] text-xs leading-relaxed font-semibold tracking-[0.12em] text-balance text-[var(--bam-gold-soft)] uppercase">
                  {item.title}
                </p>
                {item.description ? (
                  <p className="text-xs leading-relaxed text-[var(--bam-cream)]/70">
                    {item.description}
                  </p>
                ) : null}
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>

      <BandLeaves side="left" />
      <BandLeaves side="right" />
    </section>
  );
}

/**
 * One edge's leaves, all `BambooLeafSprig` (the nav bar's corner sprig), in
 * two groups per side:
 * - **Wave sprig** (`BambooWaveSprig`, shared with the other gold-wave
 *   placements via `shared/bamboo-wave-leaves.tsx`): rooted at the band edge just under the gold line, fanning
 *   up over it into the bottom of the hero, the mockup's leaves-over-the-wave
 *   moment. Its root rides the line's height at each edge (the curve sits at
 *   60/120 of the wave's height on the left, 50/120 on the right).
 * - **Floor pair**: a larger sprig tilted up behind a smaller level one in the
 *   bottom corner, so the corner reads as a layered clump, not one stamp.
 *
 * Positioned against the SECTION, not the forest body, so the wave sprigs can
 * rise past the body's `overflow-hidden`; the section's `overflow-x-clip`
 * (clip, not hidden, so the upward overflow still paints) trims anything that
 * tilts past the viewport edge and keeps horizontal scroll at zero. `z-[4]`
 * lifts the leaves over the wave wrapper's `z-[3]` gold line and over the
 * hero's z-[1]/z-[2] layers, which share this stacking context (see the note
 * on the component above). The section's top edge IS the wave's top edge (the
 * wrapper's negative margin collapses through it), so `top-*` here is
 * measured from the wave's top.
 *
 * Clearance contract (measured 320 → 1920):
 * - Captions start ≥28px in from each edge below lg, 56px at lg, 88px at
 *   1280 and ≥216px at 2xl. The body pads `pb-20` (80px), and each floor pair
 *   stays ≤80px tall wherever it overlaps a caption column, so it sits under
 *   the captions rather than beside them.
 * - Below lg the hero's copy ends 450+px above the wave (the bottom of the
 *   hero is photo), so the wave sprigs rise freely. At lg–xl the CTA row sits
 *   only 32px above the wave's top and starts 32px in from the edge, so the
 *   wave sprigs stay small and top out at the wave's own top edge. From 2xl
 *   the copy starts ≥160px in and they grow again.
 */
function BandLeaves({ side }: { side: "left" | "right" }) {
  const left = side === "left";
  return (
    <BambooWaveLeaves className="z-[4]">
      <BambooWaveSprig
        side={side}
        className={cn(
          BAND_WAVE_SPRIG_ROOT[side],
          BAND_WAVE_SPRIG_SIZE,
          // The right edge at lg+ is the hero's photo column (no copy), so
          // its sprig stays large; the left one shrinks beside the CTA row
          // and only grows back once the copy column moves inboard.
          left ? "min-[1800px]:w-44 lg:w-28 2xl:w-36" : "lg:w-40 2xl:w-44",
        )}
      />
      <BambooLeafSprig
        flip={!left}
        className={cn(
          "absolute bottom-0 w-24 opacity-80 min-[1400px]:w-36 md:w-28 2xl:w-48",
          // Tilts less on phones, where the 2×2 captions sit closer above.
          left
            ? "left-0 origin-bottom-left -rotate-[10deg] md:-rotate-[18deg]"
            : "right-0 origin-bottom-right rotate-[10deg] md:rotate-[18deg]",
        )}
      />
      <BambooLeafSprig
        flip={!left}
        className={cn(
          "absolute bottom-0 w-24 min-[1400px]:w-32 xl:w-28 2xl:w-40",
          left ? "left-3 2xl:left-6" : "right-3 2xl:right-6",
        )}
      />
    </BambooWaveLeaves>
  );
}
