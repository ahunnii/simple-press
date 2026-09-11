import Image from "next/image";

import { fieldAttr } from "~/lib/preview/section-attrs";
import { cn } from "~/lib/utils";

import { BambooGlyph } from "../../shared/bamboo-glyph";
import { BambooReveal } from "../../shared/bamboo-reveal";

/**
 * Location — heading/intro/fact list + a stylized illustrated Detroit map
 * (homepage-local, NOT `shared/bamboo-map.tsx` — this is decorative art, not
 * a live geocoded map, per design.md) with a bouncing terracotta pin and a
 * tilted lifestyle photo-card tucked over it. Ported from
 * `docs/templates/bamboo/build/mockup-refs/mockup-b.elided.html` (lines
 * ~1144-1204).
 */

function DetroitMapArt() {
  return (
    <svg
      viewBox="0 0 900 460"
      role="img"
      aria-label="Stylized map of Detroit, Michigan"
      className="block w-full"
    >
      <rect width={900} height={460} fill="var(--bamboo-sage-deep)" />
      <g fill="var(--bamboo-sage)">
        <rect x={20} y={20} width={138} height={104} rx={6} />
        <rect x={186} y={20} width={270} height={104} rx={6} />
        <rect x={484} y={20} width={114} height={104} rx={6} />
        <rect x={20} y={152} width={138} height={102} rx={6} />
        <rect x={330} y={152} width={126} height={102} rx={6} />
        <rect x={484} y={152} width={114} height={102} rx={6} />
        <rect x={626} y={152} width={108} height={102} rx={6} />
        <rect x={762} y={152} width={118} height={102} rx={6} />
        <rect x={20} y={282} width={138} height={76} rx={6} />
        <rect x={186} y={282} width={116} height={76} rx={6} />
        <rect x={330} y={282} width={126} height={76} rx={6} />
        <rect x={484} y={282} width={114} height={76} rx={6} />
      </g>
      <rect
        x={626}
        y={20}
        width={254}
        height={104}
        rx={6}
        fill="var(--bamboo-ill-moss)"
      />
      <rect
        x={186}
        y={152}
        width={116}
        height={102}
        rx={6}
        fill="var(--bamboo-ill-leaf-light)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-mid)"
        transform="translate(210,212) rotate(-12) scale(0.58)"
      />
      <rect
        x={626}
        y={282}
        width={254}
        height={76}
        rx={6}
        fill="var(--bamboo-sage)"
      />
      <g
        stroke="var(--bamboo-paper)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="18 16"
        opacity={0.55}
      >
        <path d="M470,0 V372" />
        <path d="M0,268 H900" />
      </g>
      <path
        d="M0,392 C 150,372 300,410 470,390 C 640,370 780,406 900,388 L900,460 L0,460 Z"
        fill="var(--bamboo-ill-moss)"
      />
      <path d="M462,370 h16 v92 h-16 z" fill="var(--bamboo-sage-deep)" />
    </svg>
  );
}

function MapPin() {
  return (
    <span className="bamboo-pin" aria-hidden="true">
      <svg viewBox="0 0 56 84">
        <ellipse
          cx={28}
          cy={78}
          rx={15}
          ry={5}
          fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .28)"
        />
        <path
          d="M28,2 C 42,2 53,13 53,27 C 53,46 28,72 28,72 C 28,72 3,46 3,27 C 3,13 14,2 28,2 Z"
          fill="var(--bamboo-terracotta)"
        />
        <circle cx={28} cy={27} r={10} fill="var(--bamboo-paper)" />
      </svg>
    </span>
  );
}

type Fact = { title: string; description: string };

type LocationProps = {
  sectionAttrs: Record<string, string>;
  headingFieldKey: string;
  heading: string;
  introFieldKey: string;
  intro: string;
  facts: Fact[];
  photo: string;
  photoLabel: string;
  captionFieldKey: string;
  caption: string;
};

export function BambooHomeLocation({
  sectionAttrs,
  headingFieldKey,
  heading,
  introFieldKey,
  intro,
  facts,
  photo,
  photoLabel,
  captionFieldKey,
  caption,
}: LocationProps) {
  const hasPhoto = photo.trim() !== "" && photo !== "/placeholder.svg";

  return (
    <section
      {...sectionAttrs}
      aria-labelledby="bamboo-location-h"
      className="bg-[var(--bamboo-sage)] py-[clamp(24px,3vw,44px)] pb-[var(--bamboo-sp)]"
    >
      <div className="mx-auto grid w-[min(1200px,calc(100%-48px))] grid-cols-1 items-center gap-9 lg:grid-cols-[.85fr_1.15fr] lg:gap-[clamp(36px,4.5vw,72px)]">
        <BambooReveal>
          <h2
            id="bamboo-location-h"
            {...fieldAttr(headingFieldKey)}
            className="font-heading text-[clamp(2rem,3.4vw,2.95rem)] text-[var(--bamboo-pine)]"
          >
            {heading}
          </h2>
          <p
            {...fieldAttr(introFieldKey)}
            className="mt-[18px] text-[var(--bamboo-ink)]"
          >
            {intro}
          </p>
          {facts.length > 0 && (
            <dl className="mt-7 grid gap-3.5">
              {facts.map((fact, index) => (
                <div key={`${fact.title}-${index}`}>
                  <dt className="font-heading text-[1rem] font-semibold text-[var(--bamboo-pine)]">
                    {fact.title}
                  </dt>
                  <dd className="mt-0.5 text-[.98rem] text-[var(--bamboo-ink-soft)]">
                    {fact.description}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </BambooReveal>

        <div className="relative flex flex-col">
          <BambooReveal className="bamboo-map">
            <DetroitMapArt />
            <MapPin />
            <div className="bamboo-map-chip">
              <b>Detroit, Michigan</b>
              <span>Shipping nationwide</span>
            </div>
          </BambooReveal>

          {/* The permanent tilt lives on this outer plain div, not on the
              `BambooReveal` below — `.bamboo-reveal`/`.in` manage their own
              `transform` (translateY) for the fade-up entrance, so a rotate
              utility on that same element would fight over one property. */}
          <div
            className={cn(
              "relative z-2 mt-[-58px] mr-2 ml-auto w-[min(232px,54%)] -rotate-[2deg]",
              "max-[900px]:mt-[18px] max-[900px]:mr-1 max-[900px]:w-[min(190px,58%)]",
            )}
          >
            <BambooReveal className="bamboo-photo-card" threshold={0.1}>
              {/* `BambooReveal` always renders a <div> — nest a
                  `display:contents` <figure> here so `<figcaption>` below
                  stays inside a real figure element without adding an extra
                  styled box. */}
              <figure className="contents">
                <div className="relative aspect-[1200/1131] w-full overflow-hidden rounded-lg">
                  {hasPhoto ? (
                    <Image
                      src={photo}
                      alt={photoLabel}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[var(--bamboo-sage)]">
                      <BambooGlyph id="s-pack" className="h-auto w-2/3" />
                    </div>
                  )}
                </div>
                <span className="bamboo-photo-badge" aria-hidden="true">
                  <BambooGlyph id="s-wreath" />
                </span>
                <figcaption {...fieldAttr(captionFieldKey)}>
                  {caption}
                </figcaption>
              </figure>
            </BambooReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
