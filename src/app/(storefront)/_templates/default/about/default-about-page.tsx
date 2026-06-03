import Image from "next/image";
import Link from "next/link";

import type { DefaultAboutPageTemplateProps } from "../../types";
import type { TiptapJSON } from "~/components/tiptap-renderer";
import { getRichTextFieldValue, isContentEmpty } from "~/lib/template-fields";
import { sectionGroupAttr } from "~/lib/preview/section-attrs";
import { PageTransition } from "~/components/page-animations";
import { TiptapRenderer } from "~/components/tiptap-renderer";

import { resolveFields } from "..";

export async function DefaultAboutPage({
  business,
}: DefaultAboutPageTemplateProps) {
  const f = resolveFields(business?.siteContent?.customFields, [
    "default.about.eyebrow",
    "default.about.heading",
    "default.about.hero-tagline",
    "default.about.hero-image",
    "default.about.portrait-image",
    "default.about.bio-eyebrow",
    "default.about.bio-heading",
    "default.about.paragraph-1",
    "default.about.paragraph-2",
    "default.about.paragraph-3",
    "default.about.signature",
    "default.about.pull-quote",
    "default.about.pillar-1-title",
    "default.about.pillar-1-desc",
    "default.about.pillar-2-title",
    "default.about.pillar-2-desc",
    "default.about.pillar-3-title",
    "default.about.pillar-3-desc",
    "default.about.cta-eyebrow",
    "default.about.cta-heading",
    "default.about.cta-button-text",
    "default.about.cta-button-link",
  ]);

  const storyRichContent = getRichTextFieldValue(
    business?.siteContent?.customFields as unknown,
    "default.about.story-body",
  );
  const hasRichText = !isContentEmpty(storyRichContent as TiptapJSON);

  const pillars = [
    {
      num: "One",
      title: f["default.about.pillar-1-title"] ?? "Make it well.",
      desc:
        f["default.about.pillar-1-desc"] ??
        "Better materials, fewer shortcuts.",
    },
    {
      num: "Two",
      title: f["default.about.pillar-2-title"] ?? "Price it fairly.",
      desc:
        f["default.about.pillar-2-desc"] ??
        "No hidden costs. You can see where the money goes.",
    },
    {
      num: "Three",
      title: f["default.about.pillar-3-title"] ?? "Stand behind it.",
      desc:
        f["default.about.pillar-3-desc"] ??
        "If something's wrong, write me. I'll make it right.",
    },
  ];

  return (
    <PageTransition>
      {/* ── Page hero ────────────────────────────────────────────────────── */}
      <section {...sectionGroupAttr("about", "hero")} className="border-b border-[#e8e8e8] px-6 pt-20 pb-0 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          {f["default.about.eyebrow"] && (
            <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
              {f["default.about.eyebrow"]}
            </span>
          )}
          <h1 className="mt-3 font-serif text-[clamp(40px,5vw,72px)] leading-[1.04] font-semibold tracking-[-0.03em] text-balance">
            {f["default.about.heading"] ?? "Hi — I'm the one making this."}
          </h1>
          {f["default.about.hero-tagline"] && (
            <p className="mt-4 mb-12 max-w-[560px] text-[17px] text-[#6b6b6b]">
              {f["default.about.hero-tagline"]}
            </p>
          )}

          {/* Wide hero image */}
          <div className="relative aspect-16/7 overflow-hidden rounded-t-(--radius) bg-[#efece8]">
            <Image
              src={f["default.about.hero-image"] ?? "/placeholder.svg"}
              alt={f["default.about.heading"] ?? business.name}
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* ── Maker bio ────────────────────────────────────────────────────── */}
      <section {...sectionGroupAttr("about", "bio")} className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-[320px_1fr] lg:items-start">
            {/* Portrait */}
            <div className="relative aspect-3/4 overflow-hidden rounded-(--radius) bg-[#f6f6f6] lg:sticky lg:top-[calc(72px+24px)]">
              <Image
                src={f["default.about.portrait-image"] ?? "/placeholder.svg"}
                alt={
                  f["default.about.bio-heading"] ?? `${business.name} portrait`
                }
                fill
                className="object-cover"
              />
            </div>

            {/* Text */}
            <div className="flex max-w-[600px] flex-col gap-6">
              {f["default.about.bio-eyebrow"] && (
                <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
                  {f["default.about.bio-eyebrow"]}
                </span>
              )}
              <h2 className="font-serif text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.02em] text-balance">
                {f["default.about.bio-heading"] ?? "A few words about me."}
              </h2>

              {hasRichText ? (
                <TiptapRenderer
                  content={storyRichContent as TiptapJSON}
                  className="prose prose-sm prose-p:text-[15px] prose-p:leading-[1.75] prose-p:text-[#6b6b6b] max-w-none"
                />
              ) : (
                <div className="flex flex-col gap-4">
                  {f["default.about.paragraph-1"] && (
                    <p className="text-[17px] leading-[1.65] text-[#0a0a0a]">
                      {f["default.about.paragraph-1"]}
                    </p>
                  )}
                  {f["default.about.paragraph-2"] && (
                    <p className="text-[15px] leading-[1.7] text-[#6b6b6b]">
                      {f["default.about.paragraph-2"]}
                    </p>
                  )}
                  {f["default.about.paragraph-3"] && (
                    <p className="text-[15px] leading-[1.7] text-[#6b6b6b]">
                      {f["default.about.paragraph-3"]}
                    </p>
                  )}
                </div>
              )}

              {f["default.about.signature"] && (
                <p className="mt-2 font-serif text-lg text-[#6b6b6b] italic">
                  {f["default.about.signature"]}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pull quote ───────────────────────────────────────────────────── */}
      {f["default.about.pull-quote"] && (
        <section {...sectionGroupAttr("about", "pillars")} className="border-t border-[#e8e8e8] px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-[1440px]">
            <p className="max-w-[800px] font-serif text-[clamp(22px,2.8vw,36px)] leading-[1.28] tracking-[-0.015em] text-balance">
              &ldquo;{f["default.about.pull-quote"]}&rdquo;
            </p>
          </div>
        </section>
      )}

      {/* ── Three pillars ────────────────────────────────────────────────── */}
      <section {...sectionGroupAttr("about", "pillars")} className="border-t border-[#e8e8e8] px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-12 flex flex-col gap-2">
            <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
              What I care about
            </span>
            <h2 className="font-serif text-3xl font-medium tracking-tight">
              Three things, in order.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.num} className="flex flex-col gap-3">
                <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
                  {p.num}
                </span>
                <h3 className="font-serif text-[22px] font-medium tracking-[-0.015em]">
                  {p.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-[#6b6b6b]">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section {...sectionGroupAttr("about", "cta")} className="bg-[#efece8] px-6 py-24 text-center lg:px-8">
        <div className="mx-auto max-w-[640px]">
          {f["default.about.cta-eyebrow"] && (
            <span className="text-xs font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
              {f["default.about.cta-eyebrow"]}
            </span>
          )}
          <h2 className="mt-3 font-serif text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.02em]">
            {f["default.about.cta-heading"] ?? "I'd love to hear from you."}
          </h2>
          <div className="mt-8">
            <Link
              href={f["default.about.cta-button-link"] ?? "/contact"}
              className="inline-flex h-12 items-center justify-center rounded-(--radius) bg-[#0a0a0a] px-8 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
            >
              {f["default.about.cta-button-text"] ?? "Get in touch"}
            </Link>
          </div>
        </div>
      </section>
    </PageTransition>
  );
}
