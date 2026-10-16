import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { getPageWidth, PROSE_WIDE_CLASS } from "../_components/page-width";
import { BambooEdge } from "./shared/bamboo-edge";
import { BambooGlyph } from "./shared/bamboo-glyph";
import { BambooReveal } from "./shared/bamboo-reveal";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

export function BambooGenericPage({ page }: Props) {
  // Page width (admin → Pages). Standard: a left-aligned 760px column on the
  // h1's edge (`.bamboo-prose` caps text at 68ch inside it). Wide: the whole
  // 1200 container; `.bamboo-prose--wide` lifts the root's 68ch cap and
  // `.sp-prose-wide` re-applies it to running text only.
  const wide = getPageWidth(page) === "wide";
  return (
    <>
      {/* Short sage band — CMS pages and policies get the quietest hero in
          the system: title, excerpt, one drifting leaf, nothing else. */}
      <section
        className="relative flex items-center overflow-hidden"
        style={{
          background: "var(--bamboo-sage)",
          marginTop: "calc(var(--bamboo-header-offset) * -1)",
          minHeight: "min(30vh, 340px)",
          paddingTop:
            "calc(var(--bamboo-header-offset) + clamp(30px, 3.6vw, 52px))",
          paddingBottom: "clamp(40px, 4.6vw, 68px)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
        >
          <span
            className="bamboo-drift"
            style={
              {
                "--l": "76%",
                "--t": "2%",
                "--w": "26px",
                "--dur": "18s",
                "--dl": "-6s",
                "--dx": "-84px",
                "--dy": "300px",
                "--dr": "-160deg",
              } as React.CSSProperties
            }
          >
            <BambooGlyph id="s-leaf" />
          </span>
        </div>

        <div className="relative mx-auto w-full max-w-[1200px] px-6">
          <h1 className="font-heading max-w-[18ch] text-[clamp(2.1rem,4vw,3.2rem)] leading-[1.08] font-bold tracking-[-0.026em] text-balance text-[var(--bamboo-pine)]">
            {page.title}
          </h1>
          {page.excerpt ? (
            <p className="mt-4 max-w-[48ch] text-[1.06rem] leading-[1.6] text-[var(--bamboo-ink)]">
              {page.excerpt}
            </p>
          ) : null}
        </div>
      </section>

      <BambooEdge
        from="sage"
        to="paper"
        variant="b"
        leaves={[
          { id: "s-leaf-d", l: "21%", t: "8%", w: "26px", r: "-22deg" },
          { id: "s-leaf-l", l: "74%", t: "4%", w: "23px", r: "10deg" },
        ]}
      />

      <section className="pt-[clamp(30px,3.6vw,54px)] pb-[clamp(56px,6vw,96px)]">
        <div className="mx-auto w-full max-w-[1200px] px-6">
          <BambooReveal className={wide ? undefined : "max-w-[760px]"}>
            <TiptapRenderer
              content={page.content as TiptapJSON}
              className={
                wide
                  ? `bamboo-prose bamboo-prose--wide ${PROSE_WIDE_CLASS}`
                  : "bamboo-prose"
              }
            />
            <div className={wide ? "max-w-[760px]" : undefined}>
              <PlatformPolicyNotice slug={page.slug} />
            </div>
          </BambooReveal>
        </div>
      </section>

      <BambooEdge from="paper" to="pine" variant="c" />
    </>
  );
}
