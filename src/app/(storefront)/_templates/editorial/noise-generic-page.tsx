import type { TiptapJSON } from "~/components/tiptap-renderer";
import type { RouterOutputs } from "~/trpc/react";
import { FadeIn, PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";
import { PlatformPolicyNotice } from "~/components/platform-policy-notice";

type Props = {
  page: NonNullable<RouterOutputs["content"]["getPageBySlug"]>;
};

export function NoiseGenericPage({ page }: Props) {
  const isPolicyPage = page.type === "policy";

  return (
    <PageTransition>
      {/* Two-column editorial header */}
      <section
        className="grid border-b-2 border-foreground grid-cols-1 md:grid-cols-2"
        style={{ background: "var(--vn-paper)" }}
      >
        {/* Left — eyebrow + big serif h1 + excerpt */}
        <FadeIn className="flex flex-col justify-between gap-8 px-7 py-14 border-b border-foreground md:border-b-0 md:border-r">
          <div className="flex flex-col gap-5">
            <p
              className="font-mono text-[9.5px] tracking-[0.22em] uppercase"
              style={{ color: "var(--vn-steel)" }}
            >
              {isPolicyPage ? "Section / Legal" : "Section / Content"} — Visual Noise Detroit
            </p>
            <h1
              className="font-serif italic leading-[0.97] tracking-tight"
              style={{
                fontSize: "clamp(2.8rem, 6vw, 5.5rem)",
                letterSpacing: "-0.03em",
              }}
            >
              {page.title}
            </h1>
            {page.excerpt && (
              <p
                className="font-sans text-[15px] leading-relaxed max-w-[44ch]"
                style={{ color: "var(--vn-ink-soft)" }}
              >
                {page.excerpt}
              </p>
            )}
          </div>

          {/* Bottom stamp row */}
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="vn-stamp vn-stamp-solid text-[9.5px]">Visual Noise</span>
            <span className="vn-stamp text-[9.5px]">Detroit, MI</span>
            {isPolicyPage && (
              <span className="vn-stamp text-[9.5px]">Legal</span>
            )}
          </div>
        </FadeIn>

        {/* Right — bone-bg metadata block */}
        <FadeIn
          delay={0.1}
          className="flex flex-col justify-between gap-8 px-7 py-10"
          style={{ background: "var(--vn-bone)" }}
        >
          {/* Top meta grid */}
          <div className="flex flex-col gap-6">
            <div>
              <h5
                className="font-mono text-[9px] tracking-[0.22em] uppercase mb-2"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                Page
              </h5>
              <div
                className="font-serif italic leading-[1.05]"
                style={{ fontSize: "32px", letterSpacing: "-0.01em" }}
              >
                {page.title}
              </div>
            </div>

            <div
              className="grid grid-cols-2 gap-x-8 gap-y-5 border-t pt-5"
              style={{ borderColor: "var(--vn-rule)" }}
            >
              <div>
                <h5
                  className="font-mono text-[9px] tracking-[0.22em] uppercase mb-1"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  Type
                </h5>
                <span
                  className="font-mono text-[11px] tracking-[0.08em]"
                  style={{ color: "var(--vn-ink)" }}
                >
                  {isPolicyPage ? "Legal / Policy" : "Studio · Content"}
                </span>
              </div>
              <div>
                <h5
                  className="font-mono text-[9px] tracking-[0.22em] uppercase mb-1"
                  style={{ color: "var(--vn-steel-mist)" }}
                >
                  Origin
                </h5>
                <span
                  className="font-mono text-[11px] tracking-[0.08em]"
                  style={{ color: "var(--vn-ink)" }}
                >
                  313 · Detroit
                </span>
              </div>
            </div>
          </div>

          {/* Bottom coordinates */}
          <div
            className="font-mono text-[10px] tracking-[0.08em] leading-[1.8]"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            42.3314° N · 83.0458° W
            <br />
            Because fashion shouldn&apos;t be quiet.
          </div>
        </FadeIn>
      </section>

      {/* Marquee strip */}
      <div
        className="overflow-hidden border-b border-foreground/20 py-3"
        style={{ background: "var(--vn-ink)" }}
        aria-hidden="true"
      >
        <div className="vn-marquee-track">
          {[0, 1].map((n) => (
            <span
              key={n}
              className="whitespace-nowrap font-serif italic px-6"
              style={{
                fontSize: "clamp(1.1rem, 2.2vw, 1.6rem)",
                color: "var(--vn-bone)",
                opacity: 0.65,
                letterSpacing: "-0.01em",
              }}
            >
              {page.title}
              <span className="font-mono not-italic mx-5" style={{ fontSize: "10px", color: "var(--vn-steel-mist)" }}>✦</span>
              Visual Noise — Detroit
              <span className="font-mono not-italic mx-5" style={{ fontSize: "10px", color: "var(--vn-steel-mist)" }}>✦</span>
              Because fashion shouldn&apos;t be quiet
              <span className="font-mono not-italic mx-5" style={{ fontSize: "10px", color: "var(--vn-steel-mist)" }}>✦</span>
              Est. 2014 · Gratiot Ave.
              <span className="font-mono not-italic mx-5" style={{ fontSize: "10px", color: "var(--vn-steel-mist)" }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* Body — editorial two-column layout with sidebar rule */}
      <section
        className="px-7 py-16"
        style={{ background: "var(--vn-paper)" }}
      >
        <FadeIn direction="up">
          <div className="mx-auto max-w-3xl">
            {/* Section rule header */}
            <div
              className="flex items-center gap-4 mb-10 pb-5 border-b"
              style={{ borderColor: "var(--vn-rule)" }}
            >
              <span
                className="font-mono text-[9.5px] tracking-[0.22em] uppercase"
                style={{ color: "var(--vn-steel)" }}
              >
                {page.title}
              </span>
              <div className="flex-1 h-px" style={{ background: "var(--vn-rule)" }} />
              <span
                className="font-mono text-[9.5px] tracking-[0.18em] uppercase"
                style={{ color: "var(--vn-steel-mist)" }}
              >
                313 · Det.
              </span>
            </div>

            <TiptapRenderer
              content={page.content as TiptapJSON}
              className="prose prose-base max-w-none
                prose-headings:font-serif prose-headings:italic prose-headings:font-light prose-headings:tracking-tight
                prose-h2:text-[2rem] prose-h2:leading-tight prose-h2:mt-10 prose-h2:mb-4
                prose-h3:text-[1.5rem] prose-h3:leading-tight prose-h3:mt-8 prose-h3:mb-3
                prose-p:font-sans prose-p:text-[15px] prose-p:leading-[1.7] prose-p:text-foreground/80
                prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 hover:prose-a:opacity-70
                prose-strong:font-medium prose-strong:text-foreground
                prose-li:font-sans prose-li:text-[15px] prose-li:text-foreground/80
                prose-blockquote:border-l-2 prose-blockquote:border-foreground prose-blockquote:pl-6 prose-blockquote:font-serif prose-blockquote:italic prose-blockquote:text-xl prose-blockquote:not-italic
                prose-hr:border-foreground/20"
            />
            <PlatformPolicyNotice slug={page.slug} />
          </div>
        </FadeIn>
      </section>

      {/* Bottom credentialing bar */}
      <div
        className="border-t-2 border-foreground px-7 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6"
        style={{ background: "var(--vn-bone)" }}
      >
        <div>
          <h5
            className="font-mono text-[9px] tracking-[0.22em] uppercase mb-2"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Studio
          </h5>
          <div
            className="font-serif italic leading-[1.1]"
            style={{ fontSize: "20px", letterSpacing: "-0.01em" }}
          >
            Visual Noise — Detroit
          </div>
        </div>
        <div>
          <h5
            className="font-mono text-[9px] tracking-[0.22em] uppercase mb-2"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Coordinates
          </h5>
          <div
            className="font-mono text-[11px] tracking-[0.06em] leading-[1.7]"
            style={{ color: "var(--vn-steel)" }}
          >
            42.3314° N · 83.0458° W<br />
            Gratiot Ave · 48207
          </div>
        </div>
        <div>
          <h5
            className="font-mono text-[9px] tracking-[0.22em] uppercase mb-2"
            style={{ color: "var(--vn-steel-mist)" }}
          >
            Signal
          </h5>
          <div
            className="font-mono text-[11px] tracking-[0.06em] leading-[1.7]"
            style={{ color: "var(--vn-steel)" }}
          >
            Because fashion<br />shouldn&apos;t be quiet. ✦
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
