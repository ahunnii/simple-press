import Link from "next/link";

import type { BambooGlyphId } from "../../shared/bamboo-glyph";
import { fieldAttr } from "~/lib/preview/section-attrs";

import { BambooGlyph } from "../../shared/bamboo-glyph";
import { BambooReveal } from "../../shared/bamboo-reveal";

/**
 * About teaser — "From Detroit, With Purpose" + the leaf-bulleted promises
 * list (the old sustainability trio relocates here per design.md) + the
 * Detroit skyline vignette, ported as a homepage-local component from
 * `docs/templates/bamboo/build/mockup-refs/mockup-b.elided.html` (lines
 * ~1026-1090).
 */

const PROMISE_LEAVES: BambooGlyphId[] = ["s-leaf-d", "s-leaf", "s-leaf-l"];

function DetroitVignette() {
  return (
    <svg
      viewBox="0 0 620 440"
      role="img"
      aria-label="Illustration of the Detroit skyline with a bamboo plant and paper rolls in the foreground"
      className="block w-full"
    >
      <circle cx={486} cy={112} r={66} fill="var(--bamboo-sage-deep)" />
      <use
        href="#leafP"
        fill="var(--bamboo-sage-deep)"
        transform="translate(58,86) rotate(-14) scale(0.66)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-sage-deep)"
        transform="translate(190,52) rotate(8) scale(0.5)"
      />
      <g fill="var(--bamboo-pine)">
        <rect x={30} y={214} width={56} height={106} />
        <rect x={96} y={180} width={42} height={140} />
        <rect x={148} y={238} width={64} height={82} />
        <rect x={222} y={156} width={52} height={164} />
        <rect x={240} y={112} width={9} height={46} />
        <rect x={284} y={206} width={46} height={114} />
        <rect x={340} y={176} width={58} height={144} />
        <rect x={356} y={156} width={26} height={22} />
        <rect x={408} y={234} width={48} height={86} />
        <rect x={466} y={196} width={56} height={124} />
        <rect x={532} y={222} width={60} height={98} />
      </g>
      <g fill="var(--bamboo-sage-deep)" opacity={0.55}>
        <rect x={106} y={200} width={9} height={14} />
        <rect x={122} y={200} width={9} height={14} />
        <rect x={106} y={228} width={9} height={14} />
        <rect x={122} y={228} width={9} height={14} />
        <rect x={234} y={176} width={10} height={16} />
        <rect x={252} y={176} width={10} height={16} />
        <rect x={234} y={208} width={10} height={16} />
        <rect x={252} y={208} width={10} height={16} />
        <rect x={352} y={196} width={10} height={16} />
        <rect x={372} y={196} width={10} height={16} />
        <rect x={478} y={216} width={10} height={16} />
        <rect x={498} y={216} width={10} height={16} />
      </g>
      <rect
        x={0}
        y={318}
        width={620}
        height={122}
        fill="var(--bamboo-sage-deep)"
      />
      <ellipse
        cx={96}
        cy={424}
        rx={66}
        ry={12}
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .14)"
      />
      <ellipse
        cx={252}
        cy={420}
        rx={44}
        ry={9}
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .12)"
      />
      <ellipse
        cx={344}
        cy={422}
        rx={46}
        ry={9}
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .14)"
      />
      <ellipse
        cx={496}
        cy={428}
        rx={72}
        ry={13}
        fill="rgb(var(--bamboo-ill-ground-shadow-rgb) / .16)"
      />
      <use href="#s-pot" x={26} y={232} width={140} height={194} />
      <use href="#s-pot-succ" x={212} y={330} width={80} height={95} />
      <use href="#s-roll-top" x={300} y={336} width={86} height={86} />
      <use href="#s-roll-front" x={420} y={286} width={150} height={144} />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-mid)"
        transform="translate(172,424) rotate(-10) scale(0.34)"
      />
      <use
        href="#leafP"
        fill="var(--bamboo-ill-leaf-dark)"
        transform="translate(400,410) rotate(190) scale(0.34)"
      />
    </svg>
  );
}

type PromiseRow = { title: string; description: string };

type AboutTeaserProps = {
  sectionAttrs: Record<string, string>;
  headingFieldKey: string;
  heading: string;
  bodyFieldKey: string;
  body: string;
  buttonTextFieldKey: string;
  buttonText: string;
  buttonLink: string;
  promises: PromiseRow[];
};

export function BambooHomeAboutTeaser({
  sectionAttrs,
  headingFieldKey,
  heading,
  bodyFieldKey,
  body,
  buttonTextFieldKey,
  buttonText,
  buttonLink,
  promises,
}: AboutTeaserProps) {
  return (
    <section
      {...sectionAttrs}
      aria-labelledby="bamboo-about-teaser-h"
      className="mx-auto w-[min(1200px,calc(100%-48px))] pt-[clamp(28px,3vw,52px)] pb-[var(--bamboo-sp)]"
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-[clamp(40px,5vw,84px)]">
        <BambooReveal>
          <h2
            id="bamboo-about-teaser-h"
            {...fieldAttr(headingFieldKey)}
            className="font-heading text-[clamp(2rem,3.4vw,2.95rem)] text-[var(--bamboo-pine)]"
          >
            {heading}
          </h2>
          <p
            {...fieldAttr(bodyFieldKey)}
            className="mt-5 text-[var(--bamboo-ink-soft)]"
          >
            {body}
          </p>
          {promises.length > 0 && (
            <ul className="mt-8 grid max-w-[52ch] list-none gap-[18px] p-0">
              {promises.map((promise, index) => (
                <li
                  key={`${promise.title}-${index}`}
                  className="grid grid-cols-[26px_1fr] items-start gap-3.5"
                >
                  <BambooGlyph
                    id={
                      PROMISE_LEAVES[index % PROMISE_LEAVES.length] ?? "s-leaf"
                    }
                    className="mt-1 h-auto w-[26px]"
                  />
                  <div>
                    <b className="font-heading block text-[1.06rem] font-semibold text-[var(--bamboo-pine)]">
                      {promise.title}
                    </b>
                    <span className="text-[.98rem] text-[var(--bamboo-ink-soft)]">
                      {promise.description}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-[34px]">
            <Link href={buttonLink} className="bamboo-btn bamboo-btn-primary">
              <span {...fieldAttr(buttonTextFieldKey)}>{buttonText}</span>
            </Link>
          </p>
        </BambooReveal>

        <BambooReveal className="overflow-hidden rounded-[26px] bg-[var(--bamboo-sage)] shadow-[var(--bamboo-soft-lg)]">
          <DetroitVignette />
        </BambooReveal>
      </div>
    </section>
  );
}
