"use client";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { useBambooInView } from "../../hooks/use-bamboo-reveal";
import { BambooReveal } from "../../shared/bamboo-reveal";

/**
 * Why Bamboo — the self-drawing timeline. Ported from
 * `docs/templates/bamboo/build/mockup-refs/mockup-b.elided.html` (lines
 * ~914-1015): a horizontal culm path (vertical variant swaps in ≤900px via
 * the existing `.bamboo-tl-line.bamboo-tl-h`/`.bamboo-tl-v` CSS), three
 * station discs with bespoke in-page SVG art, `useBambooInView` toggling the
 * `.drawn` class that plays the stroke-draw + node/sprig/station reveal.
 *
 * The three station illustrations are fixed positionally (growth / harvest /
 * water, matching the mockup exactly) regardless of each row's `icon`
 * field — `sustainability-list` content (title/description) is fully
 * owner-editable, but the artwork is bespoke to these three facts. A fourth
 * owner-added row (the list allows up to 4) falls back to rendering its
 * chosen Lucide icon inside a plain disc.
 */

type Station = {
  // Pre-rendered server-side: component references can't cross the RSC
  // boundary into this "use client" file, so the orchestrator sends a node.
  iconNode?: React.ReactNode;
  title: string;
  description: string;
};

type WhyBambooProps = {
  sectionAttrs: Record<string, string>;
  headingFieldKey: string;
  heading: string;
  introFieldKey: string;
  intro: string;
  stations: Station[];
};

/** Sets `--len` (stroke-dasharray/offset) from the path's real measured length. */
function setPathLength(el: SVGPathElement | null) {
  if (!el) return;
  try {
    el.style.setProperty("--len", `${Math.ceil(el.getTotalLength()) + 4}`);
  } catch {
    // getTotalLength can throw in non-rendering environments (jsdom); the
    // CSS fallback (--len: 1200) still lets the draw animation play.
  }
}

function StationGrowthArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <path
        d="M6,112 H114"
        stroke="var(--bamboo-core-tan)"
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.36}
      />
      <g fill="var(--bamboo-sage-deep)">
        <rect x={16} y={78} width={16} height={34} rx={8} />
        <rect x={38} y={56} width={16} height={56} rx={8} />
      </g>
      <g fill="var(--bamboo-ill-moss)">
        <rect x={62} y={24} width={22} height={42} rx={11} />
        <rect x={62} y={70} width={22} height={42} rx={11} />
      </g>
      <rect
        x={60}
        y={61}
        width={26}
        height={9}
        rx={4.5}
        fill="var(--bamboo-ill-stem)"
      />
      <g
        stroke="var(--bamboo-ill-leaf-pale)"
        strokeWidth={4}
        strokeLinecap="round"
      >
        <line x1={73} y1={32} x2={73} y2={54} />
        <line x1={73} y1={78} x2={73} y2={100} />
      </g>
      <path
        d="M64,26 C 57,16 50,11 43,9"
        fill="none"
        stroke="var(--bamboo-ill-stem)"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-dark)"
        transform="translate(45,9) rotate(198) scale(0.3)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-light)"
        transform="translate(52,17) rotate(158) scale(0.24)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-mid)"
        transform="translate(84,22) rotate(-26) scale(0.28)"
      />
    </svg>
  );
}

function StationHarvestArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <path
        d="M8,66 H112"
        stroke="var(--bamboo-core-tan)"
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.36}
      />
      <g stroke="var(--bamboo-ill-culm-deep)" strokeLinecap="round" fill="none">
        <path d="M42,64 C 34,80 24,88 14,94" strokeWidth={6} />
        <path d="M54,64 C 60,82 70,90 82,96" strokeWidth={6} />
        <path d="M48,64 C 47,84 46,98 44,112" strokeWidth={6} />
        <path d="M29,86 C 23,95 20,102 17,111" strokeWidth={4} />
        <path d="M71,90 C 75,98 77,104 79,112" strokeWidth={4} />
        <path d="M62,64 C 66,74 72,79 80,81" strokeWidth={4} />
      </g>
      <rect
        x={34}
        y={24}
        width={30}
        height={42}
        rx={13}
        fill="var(--bamboo-ill-culm)"
      />
      <rect
        x={32}
        y={37}
        width={34}
        height={9}
        rx={4.5}
        fill="var(--bamboo-ill-culm-deep)"
      />
      <ellipse
        cx={49}
        cy={25}
        rx={15}
        ry={5.5}
        fill="var(--bamboo-ill-culm-deep)"
      />
      <path
        d="M74,66 C 76,50 79,40 83,32"
        fill="none"
        stroke="var(--bamboo-ill-stem)"
        strokeWidth={8}
        strokeLinecap="round"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-mid)"
        transform="translate(85,32) rotate(-42) scale(0.3)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-dark)"
        transform="translate(79,27) rotate(210) scale(0.26)"
      />
    </svg>
  );
}

function StationWaterArt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <path
        d="M60,14 C 78,42 92,58 92,72 A 32,32 0 0 1 28,72 C 28,58 42,42 60,14 Z"
        fill="var(--bamboo-ill-stem)"
      />
      <path
        d="M45,74 A 15,15 0 0 0 60,89"
        fill="none"
        stroke="var(--bamboo-ill-leaf-pale)"
        strokeWidth={6}
        strokeLinecap="round"
      />
      <path
        d="M22,26 C 28,36 32,41 32,46 A 10,10 0 0 1 12,46 C 12,41 16,36 22,26 Z"
        fill="var(--bamboo-ill-moss)"
      />
      <path
        d="M100,40 C 105,48 108,52 108,56 A 8,8 0 0 1 92,56 C 92,52 95,48 100,40 Z"
        fill="var(--bamboo-ill-moss)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-mid)"
        transform="translate(10,106) rotate(-6) scale(0.38)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-dark)"
        transform="translate(112,102) rotate(174) scale(0.32)"
      />
    </svg>
  );
}

const STATION_ART = [StationGrowthArt, StationHarvestArt, StationWaterArt];

export function BambooHomeWhyBamboo({
  sectionAttrs,
  headingFieldKey,
  heading,
  introFieldKey,
  intro,
  stations,
}: WhyBambooProps) {
  const { ref, inView } = useBambooInView(0.2);

  return (
    <section
      {...sectionAttrs}
      aria-labelledby="bamboo-why-h"
      className="bg-[var(--bamboo-sage)] py-[clamp(24px,3vw,44px)] pb-[var(--bamboo-sp)]"
    >
      <div className="mx-auto w-[min(1200px,calc(100%-48px))]">
        <BambooReveal className="mx-auto max-w-[660px] text-center">
          <h2
            id="bamboo-why-h"
            {...fieldAttr(headingFieldKey)}
            className="font-heading text-[clamp(2rem,3.4vw,2.95rem)] text-[var(--bamboo-pine)]"
          >
            {heading}
          </h2>
          <p
            {...fieldAttr(introFieldKey)}
            className="mx-auto mt-4 max-w-[56ch] text-[var(--bamboo-ink-soft)]"
          >
            {intro}
          </p>
        </BambooReveal>

        <div ref={ref} className={cn("bamboo-timeline", inView && "drawn")}>
          <div className="bamboo-tl-line bamboo-tl-h" aria-hidden="true">
            <svg viewBox="0 0 1120 140" preserveAspectRatio="none">
              <path
                ref={setPathLength}
                className="bamboo-tl-path"
                d="M 26,68 C 250,46 380,88 560,66 C 740,44 870,88 1094,66"
                fill="none"
                stroke="var(--bamboo-ill-culm)"
                strokeWidth={16}
                strokeLinecap="round"
              />
              <path
                ref={setPathLength}
                className="bamboo-tl-path"
                d="M 30,62 C 250,41 380,83 560,60 C 740,38 866,82 1090,60"
                fill="none"
                stroke="var(--bamboo-ill-culm-hi)"
                strokeWidth={4}
                strokeLinecap="round"
                opacity={0.85}
              />
              <rect
                className="bamboo-tl-node"
                x={299}
                y={55}
                width={22}
                height={24}
                rx={7}
                fill="var(--bamboo-ill-culm-deep)"
                style={{ "--nd": ".5s" } as React.CSSProperties}
              />
              <rect
                className="bamboo-tl-node"
                x={799}
                y={54}
                width={22}
                height={24}
                rx={7}
                fill="var(--bamboo-ill-culm-deep)"
                style={{ "--nd": ".95s" } as React.CSSProperties}
              />
              <use
                className="bamboo-tl-sprig"
                href="#s-sprig"
                x={400}
                y={4}
                width={94}
                height={74}
                style={{ "--nd": ".75s" } as React.CSSProperties}
              />
              <use
                className="bamboo-tl-sprig"
                href="#s-sprig"
                x={674}
                y={0}
                width={84}
                height={66}
                style={{ "--nd": "1.15s" } as React.CSSProperties}
              />
            </svg>
          </div>
          <div className="bamboo-tl-line bamboo-tl-v" aria-hidden="true">
            <svg viewBox="0 0 40 700" preserveAspectRatio="none">
              <path
                ref={setPathLength}
                className="bamboo-tl-path"
                d="M 20,6 C 4,170 36,330 20,490 C 9,590 30,650 20,694"
                fill="none"
                stroke="var(--bamboo-ill-culm)"
                strokeWidth={16}
                strokeLinecap="round"
              />
              <rect
                className="bamboo-tl-node"
                x={8}
                y={222}
                width={24}
                height={22}
                rx={7}
                fill="var(--bamboo-ill-culm-deep)"
                style={{ "--nd": ".5s" } as React.CSSProperties}
              />
              <rect
                className="bamboo-tl-node"
                x={8}
                y={510}
                width={24}
                height={22}
                rx={7}
                fill="var(--bamboo-ill-culm-deep)"
                style={{ "--nd": ".95s" } as React.CSSProperties}
              />
            </svg>
          </div>

          <div className="bamboo-tl-stations">
            {stations.map((station, index) => {
              const Art = STATION_ART[index];
              return (
                <div
                  key={`${station.title}-${index}`}
                  className="bamboo-station"
                  style={
                    { "--sd": `${0.25 + index * 0.4}s` } as React.CSSProperties
                  }
                >
                  <span className="bamboo-disc">
                    {Art ? <Art /> : station.iconNode}
                  </span>
                  <div>
                    <h3 className="font-heading mt-[22px] text-[1.3rem] text-[var(--bamboo-pine)] max-[900px]:mt-0.5">
                      {station.title}
                    </h3>
                    <p className="mt-2.5 max-w-[34ch] text-[var(--bamboo-ink)]">
                      {station.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
